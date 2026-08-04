import { NextRequest, NextResponse } from "next/server";
import { lookupResi } from "@/lib/sheets";
import { resolveEkspedisi } from "@/lib/ekspedisi";

export async function POST(req: NextRequest) {
  try {
    const { resi } = await req.json();
    if (!resi || typeof resi !== "string" || !resi.trim()) {
      return NextResponse.json({ error: "Resi kosong" }, { status: 400 });
    }
    const cleaned = resi.trim();

    const { row, alreadyGenerated } = await lookupResi(cleaned);

    if (!row) {
      return NextResponse.json(
        { error: `Resi "${cleaned}" tidak ditemukan di database` },
        { status: 404 }
      );
    }

    if (alreadyGenerated) {
      return NextResponse.json(
        { error: `Resi "${cleaned}" sudah pernah digenerate sebelumnya` },
        { status: 409 }
      );
    }

    return NextResponse.json({
      resi: row.resi,
      noOrder: row.noOrder,
      warehouse: row.warehouse,
      channel: row.channel,
      service: row.service,
      ekspedisi: resolveEkspedisi(row.resi),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal memproses resi" }, { status: 500 });
  }
}
