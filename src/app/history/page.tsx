"use client";

import { useEffect, useState } from "react";

type HistoryDoc = {
  docNo: string;
  generatedAt: string;
  totalResi: number;
  ekspedisiBreakdown: { name: string; count: number }[];
  items: { resi: string; noOrder: string; ekspedisi: string; warehouse: string }[];
};

export default function HistoryPage() {
  const [docs, setDocs] = useState<HistoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDocs(data.docs);
        }
      })
      .catch(() => setError("Gagal terhubung ke server"))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    if (!iso) return "-";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleString("id-ID");
  }

  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            History
          </h1>
          <p className="text-xs text-zinc-500">
            Daftar dokumen (doc_no) yang pernah digenerate.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">Memuat riwayat...</p>
        ) : docs.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
            Belum ada dokumen yang digenerate.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((doc) => (
              <div
                key={doc.docNo}
                className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <button
                  onClick={() => setExpanded(expanded === doc.docNo ? null : doc.docNo)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {doc.docNo}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(doc.generatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1.5">
                      {doc.ekspedisiBreakdown.map((e) => (
                        <span
                          key={e.name}
                          className="rounded-full bg-[#0f9b8e]/10 px-2 py-0.5 text-xs text-[#0f9b8e] dark:bg-[#0f9b8e]/20"
                        >
                          {e.name} ({e.count})
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      {doc.totalResi} resi
                    </span>
                    <span className="text-zinc-400">{expanded === doc.docNo ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expanded === doc.docNo && (
                  <div className="max-h-64 overflow-auto border-t border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-zinc-100 text-left dark:bg-zinc-900">
                        <tr>
                          <th className="px-3 py-1.5">Resi</th>
                          <th className="px-3 py-1.5">No Order</th>
                          <th className="px-3 py-1.5">Ekspedisi</th>
                          <th className="px-3 py-1.5">Warehouse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.items.map((item) => (
                          <tr key={item.resi} className="border-t border-zinc-200 dark:border-zinc-800">
                            <td className="px-3 py-1 font-mono">{item.resi}</td>
                            <td className="px-3 py-1">{item.noOrder || "-"}</td>
                            <td className="px-3 py-1">{item.ekspedisi}</td>
                            <td className="px-3 py-1">{item.warehouse || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
