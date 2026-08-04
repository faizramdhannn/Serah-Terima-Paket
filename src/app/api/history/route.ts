import { NextResponse } from "next/server";
import { getLogHistory } from "@/lib/sheets";

export async function GET() {
  try {
    const docs = await getLogHistory();
    return NextResponse.json({ docs });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal memuat riwayat" }, { status: 500 });
  }
}
