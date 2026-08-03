// Mapping prefix nomor resi -> nama ekspedisi.
// Urutan penting: prefix lebih panjang/spesifik dicek lebih dulu.
// Edit bebas sesuai kebutuhan gudang.
export const EKSPEDISI_PREFIX_MAP: { prefix: string; name: string }[] = [
  { prefix: "SPXID", name: "Shopee Xpress" },
  { prefix: "SPX", name: "Shopee Xpress" },
  { prefix: "JY", name: "J&T Express" },
  { prefix: "TG", name: "JNE" },
  { prefix: "JP", name: "J&T Cargo" },
  { prefix: "ID", name: "ID Express" },
  { prefix: "SICEPAT", name: "SiCepat" },
  { prefix: "SAP", name: "SAP Express" },
  { prefix: "ANTERAJA", name: "AnterAja" },
  { prefix: "NINJA", name: "Ninja Xpress" },
  { prefix: "LEX", name: "Lazada Express" },
  { prefix: "TIKI", name: "TIKI" },
  { prefix: "POS", name: "POS Indonesia" },
  { prefix: "WAHANA", name: "Wahana" },
  { prefix: "GK", name: "GoSend/GrabExpress" },
];

const DEFAULT_EKSPEDISI = "LAINNYA (Cek Manual)";

/**
 * Menentukan nama ekspedisi dari nomor resi berdasarkan prefix.
 * Suffix seperti "-OOSKRW" di beberapa resi diabaikan saat pencocokan prefix.
 */
export function resolveEkspedisi(resi: string): string {
  const cleaned = resi.trim().toUpperCase();
  for (const { prefix, name } of EKSPEDISI_PREFIX_MAP) {
    if (cleaned.startsWith(prefix)) return name;
  }
  return DEFAULT_EKSPEDISI;
}
