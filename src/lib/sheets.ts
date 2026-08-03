import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SHEET_ID as string;
const MASTER_SHEET = "master_tracking";
const LOG_SHEET = "log_historical";

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

let cache: { rows: MasterRow[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function fetchMasterRows(): Promise<MasterRow[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }
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
  cache = { rows, fetchedAt: Date.now() };
  return rows;
}

export async function findByResi(resi: string): Promise<MasterRow | null> {
  const rows = await fetchMasterRows();
  const target = resi.trim().toUpperCase();
  return rows.find((r) => r.resi.trim().toUpperCase() === target) ?? null;
}

export async function getGeneratedResiSet(): Promise<Set<string>> {
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
