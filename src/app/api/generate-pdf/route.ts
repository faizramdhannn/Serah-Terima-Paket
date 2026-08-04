import { NextRequest, NextResponse } from "next/server";
import { appendToLogHistorical, findGeneratedResi } from "@/lib/sheets";
import { buildReceiptPdf, PdfItem } from "@/lib/pdf";

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: PdfItem[] };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "List resi kosong" }, { status: 400 });
    }

    // Re-validate against log_historical to avoid race conditions (double submit).
    const generatedSet = await findGeneratedResi(items.map((i) => i.resi));
    const dupes = items.filter((i) => generatedSet.has(i.resi.trim().toUpperCase()));
    if (dupes.length > 0) {
      return NextResponse.json(
        {
          error: `Resi berikut sudah pernah digenerate: ${dupes
            .map((d) => d.resi)
            .join(", ")}`,
        },
        { status: 409 }
      );
    }

    const docNo = `BAST-${Date.now()}`;
    const pdfBuffer = await buildReceiptPdf(items, docNo);

    await appendToLogHistorical(
      items.map((i) => ({
        resi: i.resi,
        noOrder: i.noOrder,
        ekspedisi: i.ekspedisi,
        warehouse: i.warehouse,
        docNo,
      }))
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${docNo}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal generate PDF" }, { status: 500 });
  }
}
