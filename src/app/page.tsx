import Link from "next/link";

export default function Home() {
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Serah Terima Paket
        </h1>
        <p className="mb-8 text-sm text-zinc-500">
          Scan resi, generate PDF berita acara serah terima, dan lihat riwayat dokumen yang
          pernah dibuat.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/list-resi"
            className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-[#0f9b8e] hover:bg-[#0f9b8e]/5 dark:border-zinc-800 dark:hover:bg-[#0f9b8e]/10"
          >
            <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">List Resi</h2>
            <p className="text-sm text-zinc-500">
              Scan atau ketik nomor resi, lalu generate PDF berita acara.
            </p>
          </Link>
          <Link
            href="/history"
            className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-[#0f9b8e] hover:bg-[#0f9b8e]/5 dark:border-zinc-800 dark:hover:bg-[#0f9b8e]/10"
          >
            <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">History</h2>
            <p className="text-sm text-zinc-500">
              Lihat daftar dokumen (doc_no) yang pernah digenerate sebelumnya.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
