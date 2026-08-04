"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TORCH_LOGO_URL } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/list-resi", label: "List Resi" },
  { href: "/history", label: "History" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950">
      <Image
        src={TORCH_LOGO_URL}
        alt="Torch"
        width={90}
        height={36}
        className="mb-8 w-auto object-contain"
        style={{ height: "32px", width: "auto" }}
        unoptimized
      />
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#0f9b8e]/10 text-[#0f9b8e] dark:bg-[#0f9b8e]/20"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
