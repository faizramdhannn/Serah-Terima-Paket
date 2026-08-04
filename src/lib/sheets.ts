import { google } from "googleapis";
import { redis } from "./redis";

const SPREADSHEET_ID = process.env.SHEET_ID as string;
const MASTER_SHEET = "master_tracking";
const LOG_SHEET = "log_historical";

const MASTER_CACHE_KEY = "master_tracking:rows";
const MASTER_CACHE_TTL_SEC = 60;
const GENERATED_SET_KEY = "log_historical:resi_set";

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey || !SPREADSHEET_ID) {
    throw new Error("Missing Google Sheets credentials/env vars");
  }
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export type MasterRow = {
  rowIndex: number; // 1-based row number in the sheet
  noOrder: string;
  channel: string;
  service: string;
  resi: string;
  warehouse: string;
};

// L1 cache: survives only within a warm serverless instance.
let memCache: { map: Map<string, MasterRow>; fetchedAt: number } | null = null;
const MEM_CACHE_TTL_MS = 15_000;

// Tracks whether the Redis generated-resi set has been hydrated from the
// sheet at least once in this warm instance, so we skip the EXISTS check
// (one Redis round-trip) on every subsequent call.
let generatedSetHydrated = false;

async function fetchMasterRowsFromSheet(): Promise<MasterRow[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_SHEET}!B:H`, // sales_order..order_warehouse
  });
  const values = res.data.values ?? [];
  const rows: MasterRow[] = [];
  // values[0] is header row (B1:H1); actual data starts at index 1 = sheet row 2
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const noOrder = row[0] ?? ""; // B: sales_order
    const channel = row[1] ?? ""; // C: sales_channel
    const service = row[3] ?? ""; // E: order_service
    const resi = row[4] ?? ""; // F: order_traking
    const warehouse = row[6] ?? ""; // H: order_warehouse
    if (!resi) continue;
    rows.push({ rowIndex: i + 1, noOrder, channel, service, resi, warehouse });
  }
  return rows;
}

function buildMasterMap(rows: MasterRow[]): Map<string, MasterRow> {
  const map = new Map<string, MasterRow>();
  for (const row of rows) {
    map.set(row.resi.trim().toUpperCase(), row);
  }
  return map;
}

async function getMasterRowsMap(): Promise<Map<string, MasterRow>> {
  if (memCache && Date.now() - memCache.fetchedAt < MEM_CACHE_TTL_MS) {
    return memCache.map;
  }

  let rows: MasterRow[] | null = null;

  if (redis) {
    const cached = await redis.get<MasterRow[]>(MASTER_CACHE_KEY);
    if (cached) rows = cached;
  }

  if (!rows) {
    rows = await fetchMasterRowsFromSheet();
    if (redis) {
      await redis.set(MASTER_CACHE_KEY, rows, { ex: MASTER_CACHE_TTL_SEC });
    }
  }

  const map = buildMasterMap(rows);
  memCache = { map, fetchedAt: Date.now() };
  return map;
}

export async function findByResi(resi: string): Promise<MasterRow | null> {
  const map = await getMasterRowsMap();
  return map.get(resi.trim().toUpperCase()) ?? null;
}

export async function getAllMasterRows(): Promise<MasterRow[]> {
  const map = await getMasterRowsMap();
  return Array.from(map.values()).sort((a, b) => b.rowIndex - a.rowIndex);
}

async function hydrateGeneratedSetFromSheet(): Promise<Set<string>> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOG_SHEET}!A:A`,
  });
  const values = res.data.values ?? [];
  const set = new Set<string>();
  for (let i = 1; i < values.length; i++) {
    const resi = values[i][0];
    if (resi) set.add(String(resi).trim().toUpperCase());
  }
  return set;
}

async function ensureGeneratedSetHydrated(): Promise<void> {
  if (!redis || generatedSetHydrated) return;

  const exists = await redis.exists(GENERATED_SET_KEY);
  if (!exists) {
    const set = await hydrateGeneratedSetFromSheet();
    if (set.size > 0) {
      const members = Array.from(set) as [string, ...string[]];
      await redis.sadd(GENERATED_SET_KEY, ...members);
    } else {
      // Mark as hydrated even when empty so we don't re-scan the sheet every call.
      await redis.sadd(GENERATED_SET_KEY, "__init__");
      await redis.srem(GENERATED_SET_KEY, "__init__");
    }
  }
  generatedSetHydrated = true;
}

/**
 * Checks which of the given resi have already been generated, without
 * pulling the entire (potentially large) generated-resi set over the wire.
 */
export async function findGeneratedResi(resiList: string[]): Promise<Set<string>> {
  const upper = resiList.map((r) => r.trim().toUpperCase());
  if (upper.length === 0) return new Set();

  if (!redis) {
    const fullSet = await hydrateGeneratedSetFromSheet();
    return new Set(upper.filter((r) => fullSet.has(r)));
  }

  await ensureGeneratedSetHydrated();
  const members = upper as [string, ...string[]];
  const results = await redis.smismember(GENERATED_SET_KEY, members);
  const found = new Set<string>();
  results.forEach((isMember, i) => {
    if (isMember) found.add(upper[i]);
  });
  return found;
}

/**
 * Combined lookup for the scan flow: resolves the master row and checks
 * duplicate status in as few Redis round-trips as possible (pipelined when
 * both reads are needed against Redis).
 */
export async function lookupResi(
  resi: string
): Promise<{ row: MasterRow | null; alreadyGenerated: boolean }> {
  const upper = resi.trim().toUpperCase();

  // Master row cache still warm in this instance — only need the dup check.
  if (memCache && Date.now() - memCache.fetchedAt < MEM_CACHE_TTL_MS) {
    const generated = await findGeneratedResi([upper]);
    return { row: memCache.map.get(upper) ?? null, alreadyGenerated: generated.has(upper) };
  }

  if (!redis) {
    const map = await getMasterRowsMap();
    const generated = await findGeneratedResi([upper]);
    return { row: map.get(upper) ?? null, alreadyGenerated: generated.has(upper) };
  }

  await ensureGeneratedSetHydrated();

  const pipeline = redis.pipeline();
  pipeline.get<MasterRow[]>(MASTER_CACHE_KEY);
  pipeline.sismember(GENERATED_SET_KEY, upper);
  const [cachedRows, isMember] = (await pipeline.exec()) as [MasterRow[] | null, number];

  let rows = cachedRows;
  if (!rows) {
    rows = await fetchMasterRowsFromSheet();
    await redis.set(MASTER_CACHE_KEY, rows, { ex: MASTER_CACHE_TTL_SEC });
  }

  const map = buildMasterMap(rows);
  memCache = { map, fetchedAt: Date.now() };

  return { row: map.get(upper) ?? null, alreadyGenerated: !!isMember };
}

export async function appendToLogHistorical(
  entries: { resi: string; noOrder: string; ekspedisi: string; warehouse: string; docNo: string }[]
) {
  if (entries.length === 0) return;
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  const values = entries.map((e) => [e.resi, e.noOrder, e.ekspedisi, e.warehouse, now, e.docNo]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOG_SHEET}!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  if (redis) {
    const resiUpper = entries.map((e) => e.resi.trim().toUpperCase()) as [string, ...string[]];
    await redis.sadd(GENERATED_SET_KEY, ...resiUpper);
  }
}

export type HistoryDoc = {
  docNo: string;
  generatedAt: string;
  totalResi: number;
  ekspedisiBreakdown: { name: string; count: number }[];
  items: { resi: string; noOrder: string; ekspedisi: string; warehouse: string }[];
};

export async function getLogHistory(): Promise<HistoryDoc[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOG_SHEET}!A:F`,
  });
  const values = res.data.values ?? [];

  const docsByNo = new Map<string, HistoryDoc>();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const [resi, noOrder, ekspedisi, warehouse, generatedAt, docNo] = row;
    if (!docNo) continue;

    let doc = docsByNo.get(docNo);
    if (!doc) {
      doc = { docNo, generatedAt: generatedAt ?? "", totalResi: 0, ekspedisiBreakdown: [], items: [] };
      docsByNo.set(docNo, doc);
    }
    doc.totalResi += 1;
    doc.items.push({ resi: resi ?? "", noOrder: noOrder ?? "", ekspedisi: ekspedisi ?? "", warehouse: warehouse ?? "" });

    const entry = doc.ekspedisiBreakdown.find((e) => e.name === ekspedisi);
    if (entry) entry.count += 1;
    else doc.ekspedisiBreakdown.push({ name: ekspedisi ?? "-", count: 1 });
  }

  return Array.from(docsByNo.values()).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function ensureLogHistoricalSheet() {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === LOG_SHEET);
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: LOG_SHEET } } }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOG_SHEET}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["resi", "no_order", "ekspedisi", "warehouse", "generated_at", "doc_no"]],
    },
  });
}
