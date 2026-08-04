"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TORCH_LOGO_URL } from "@/lib/constants";
import { ChevronLeftIcon, HistoryIcon, HomeIcon, ListIcon, TorchMark } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/list-resi", label: "List Resi", Icon: ListIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    setMounted(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-zinc-200 bg-white py-6 transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 ${
        collapsed ? "w-16 px-2" : "w-56 px-4"
      } ${mounted ? "" : "invisible"}`}
    >
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <ChevronLeftIcon
          className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      <div className="mb-8 flex items-center px-1">
        {collapsed ? (
          <TorchMark className="h-8 w-8" />
        ) : (
          <Image
            src={TORCH_LOGO_URL}
            alt="Torch"
            width={90}
            height={36}
            className="w-auto object-contain"
            style={{ height: "32px", width: "auto" }}
            unoptimized
          />
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "bg-[#0f9b8e]/10 text-[#0f9b8e] dark:bg-[#0f9b8e]/20"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <item.Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
