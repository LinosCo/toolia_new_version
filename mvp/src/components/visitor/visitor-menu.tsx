"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Map, Menu, X } from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export function VisitorMenu({ basePath }: { basePath: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Solo route esistenti. Scanner QR e Lingua tornano quando avranno
  // una pagina implementata.
  const items: MenuItem[] = [
    { label: "Homepage", href: basePath, icon: Home },
    { label: "Itinerari", href: `${basePath}/itinerari`, icon: Compass },
    { label: "Mappa", href: `${basePath}/mappa`, icon: Map },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-4 left-4 md:top-14 z-30 h-11 w-11 rounded-full bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg flex items-center justify-center hover:bg-card transition-colors"
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-[min(82vw,320px)] bg-card border-r border-border/70 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <p className="font-heading italic text-2xl tracking-tight">
                Menu
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Chiudi menu"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {items.map((it) => {
                const Icon = it.icon;
                const active =
                  pathname === it.href ||
                  (it.href !== basePath && pathname?.startsWith(it.href));
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-[15px] transition-colors ${
                      active
                        ? "bg-brand/10 text-brand font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            <footer className="p-5 border-t border-border/60 text-[11px] text-muted-foreground">
              Powered by{" "}
              <a
                href="https://voler.ai"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Voler.ai
              </a>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}
