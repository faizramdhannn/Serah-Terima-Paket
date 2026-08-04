import { NextResponse } from "next/server";
import { getAllMasterRows } from "@/lib/sheets";
import { resolveEkspedisi } from "@/lib/ekspedisi";

export async function GET() {
  try {
    const rows = await getAllMasterRows();
    const data = rows.map((row) => ({
      noOrder: row.noOrder,
      resi: row.resi,
      channel: row.channel,
      service: row.service,
      warehouse: row.warehouse,
      ekspedisi: resolveEkspedisi(row.resi),
    }));
    return NextResponse.json({ rows: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal memuat data master tracking" }, { status: 500 });
  }
}
