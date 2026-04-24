"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Settings, LogOut, ChevronsUpDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNav = [{ href: "/", label: "Progetti", icon: FolderKanban }];

const secondaryNav = [
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (
      (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
    );
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Utente";
  const initials = getInitials(user?.name, user?.email);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="px-6 pt-7 pb-8">
        <Link href="/" className="inline-flex items-baseline gap-1 group">
          <span className="font-heading text-3xl italic leading-none text-foreground">
            Toolia
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-brand translate-y-[-2px] group-hover:scale-125 transition-transform" />
        </Link>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Studio
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-8 overflow-y-auto">
        <div>
          <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <ul className="space-y-0.5">
            {mainNav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={1.6}
                    />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1 w-1 rounded-full bg-brand" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Account
          </p>
          <ul className="space-y-0.5">
            {secondaryNav.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={1.6}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border/80">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <div className="h-9 w-9 rounded-full bg-brand/15 text-brand flex items-center justify-center text-sm font-medium">
              {initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {user?.role ?? "—"}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
