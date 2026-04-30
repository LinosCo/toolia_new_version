"use client";

import Link from "next/link";
import { QrCode } from "lucide-react";

export function ScannerFab({ basePath }: { basePath: string }) {
  return (
    <Link
      href={`${basePath}/scanner`}
      className="absolute bottom-4 left-4 z-40 h-14 w-14 rounded-full bg-brand text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Apri scanner QR"
    >
      <QrCode className="h-5 w-5" strokeWidth={1.8} />
    </Link>
  );
}
