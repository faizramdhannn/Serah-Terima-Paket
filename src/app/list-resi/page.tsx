"use client";

import { useRef, useState } from "react";

type ScanItem = {
  resi: string;
  noOrder: string;
  ekspedisi: string;
  warehouse: string;
  channel: string;
  service: string;
};

export default function ListResiPage() {
  const [resiInput, setResiInput] = useState("");
  const [items, setItems] = useState<ScanItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAddResi(e: React.FormEvent) {
    e.preventDefault();
    const resi = resiInput.trim();
    if (!resi) return;

    if (items.some((i) => i.resi.toUpperCase() === resi.toUpperCase())) {
      setError(`Resi "${resi}" sudah ada di list`);
      setResiInput("");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lookup-resi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resi }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses resi");
        return;
      }
      setItems((prev) => [...prev, data]);
      setResiInput("");
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function removeItem(resi: string) {
    setItems((prev) => prev.filter((i) => i.resi !== resi));
  }

  async function handleGenerate() {
    if (items.length === 0) return;
    // Open the tab synchronously (within the click handler) so popup blockers allow it.
    const printWindow = window.open("", "_blank");
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal generate PDF");
        printWindow?.close();
        return;
      }

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || "berita-acara-serah-terima.pdf";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (printWindow) {
        printWindow.document.title = filename;
        printWindow.location.href = url;
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Popup blocked: fall back to a direct download.
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
      setItems([]);
    } catch {
      setError("Gagal terhubung ke server");
      printWindow?.close();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            List Resi
          </h1>
          <p className="text-xs text-zinc-500">
            Scan resi, lalu generate PDF berita acara serah terima.
          </p>
        </div>

        <form onSubmit={handleAddResi} className="mb-4 flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={resiInput}
            onChange={(e) => setResiInput(e.target.value)}
            placeholder="Scan / ketik nomor resi..."
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-mono focus:border-[#0f9b8e] focus:outline-none focus:ring-1 focus:ring-[#0f9b8e] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#0f9b8e] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0c7d73] disabled:opacity-50"
          >
            {loading ? "..." : "Tambah"}
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 max-h-[60vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0f9b8e]/10 text-left dark:bg-[#0f9b8e]/20">
              <tr>
                <th className="px-2 py-1.5 w-7">No</th>
                <th className="px-2 py-1.5">Resi</th>
                <th className="px-2 py-1.5">No Order</th>
                <th className="px-2 py-1.5">Ekspedisi</th>
                <th className="px-2 py-1.5">Channel</th>
                <th className="px-2 py-1.5">Servis</th>
                <th className="px-2 py-1.5">Warehouse</th>
                <th className="px-2 py-1.5 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-400">
                    Belum ada resi discan
                  </td>
                </tr>
              )}
              {items.map((item, idx) => (
                <tr key={item.resi} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-2 py-1">{idx + 1}</td>
                  <td className="px-2 py-1 font-mono">{item.resi}</td>
                  <td className="px-2 py-1">{item.noOrder || "-"}</td>
                  <td className="px-2 py-1">{item.ekspedisi}</td>
                  <td className="px-2 py-1">{item.channel || "-"}</td>
                  <td className="px-2 py-1">{item.service || "-"}</td>
                  <td className="px-2 py-1">{item.warehouse || "-"}</td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => removeItem(item.resi)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">{items.length} resi siap digenerate</span>
          <button
            onClick={handleGenerate}
            disabled={items.length === 0 || generating}
            className="rounded-lg bg-[#0f9b8e] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0c7d73] disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
