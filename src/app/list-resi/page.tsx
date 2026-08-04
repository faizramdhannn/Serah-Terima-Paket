"use client";

import { useEffect, useMemo, useState } from "react";

type MasterRow = {
  noOrder: string;
  resi: string;
  channel: string;
  service: string;
  warehouse: string;
  ekspedisi: string;
};

export default function ListResiPage() {
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/master-tracking")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRows(data.rows);
        }
      })
      .catch(() => setError("Gagal terhubung ke server"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.resi.toUpperCase().includes(q) ||
        r.noOrder.toUpperCase().includes(q) ||
        r.warehouse.toUpperCase().includes(q) ||
        r.ekspedisi.toUpperCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
              List Resi
            </h1>
            <p className="text-xs text-zinc-500">
              Data dari master_tracking ({filtered.length} dari {rows.length} baris).
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari resi, no order, warehouse..."
            className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#0f9b8e] focus:outline-none focus:ring-1 focus:ring-[#0f9b8e] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">Memuat data...</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0f9b8e]/10 text-left dark:bg-[#0f9b8e]/20">
                <tr>
                  <th className="px-2 py-1.5">Resi</th>
                  <th className="px-2 py-1.5">No Order</th>
                  <th className="px-2 py-1.5">Ekspedisi</th>
                  <th className="px-2 py-1.5">Channel</th>
                  <th className="px-2 py-1.5">Servis</th>
                  <th className="px-2 py-1.5">Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-400">
                      Tidak ada data yang cocok.
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr key={row.resi} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-2 py-1 font-mono">{row.resi}</td>
                    <td className="px-2 py-1">{row.noOrder || "-"}</td>
                    <td className="px-2 py-1">{row.ekspedisi}</td>
                    <td className="px-2 py-1">{row.channel || "-"}</td>
                    <td className="px-2 py-1">{row.service || "-"}</td>
                    <td className="px-2 py-1">{row.warehouse || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
