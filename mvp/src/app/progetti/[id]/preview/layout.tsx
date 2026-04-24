"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";
import { ChatbotFab } from "./_components/chatbot-fab";

export default function PreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-[oklch(0.92_0.008_80)] relative overflow-hidden">
      {/* Subtle ambient texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.5_0.1_40) 0%, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.4_0.08_60) 0%, transparent 40%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-5">
        <Link
          href={`/progetti/${id}/pubblica`}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground/90 backdrop-blur text-background text-xs font-medium hover:bg-foreground transition-colors shadow-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Torna allo Studio
        </Link>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" strokeWidth={1.8} />
          Anteprima come la vedrà il visitatore
        </div>
      </header>

      {/* Device frame centered */}
      <div className="relative z-10 flex items-start justify-center pt-2 pb-16 px-4">
        <div className="relative">
          {/* Outer bezel (iPhone 15 Pro proportions) */}
          <div
            className="relative bg-[#0a0a0a] rounded-[58px] p-[12px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),0_12px_30px_-12px_rgba(0,0,0,0.3)]"
            style={{ width: "402px" }}
          >
            {/* Side buttons decorative */}
            <span className="absolute top-24 -left-[3px] w-[3px] h-10 bg-[#1a1a1a] rounded-l" />
            <span className="absolute top-40 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l" />
            <span className="absolute top-60 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l" />
            <span className="absolute top-32 -right-[3px] w-[3px] h-20 bg-[#1a1a1a] rounded-r" />

            {/* Screen */}
            <div
              className="relative bg-paper rounded-[46px] overflow-hidden"
              style={{ height: "820px" }}
            >
              {/* Dynamic Island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-50 shadow-inner" />

              {/* Status bar (fake iOS) */}
              <div className="absolute top-0 left-0 right-0 h-[44px] flex items-center justify-between px-8 text-[13px] font-semibold text-foreground z-40 pointer-events-none">
                <span className="tabular-nums">9:41</span>
                <span className="flex items-center gap-1">
                  <StatusIcons />
                </span>
              </div>

              {/* Content scrollable */}
              <div className="h-full overflow-y-auto overscroll-contain pt-[44px]">
                {children}
              </div>

              <ChatbotFab projectId={id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcons() {
  return (
    <>
      {/* Signal */}
      <svg
        width="17"
        height="11"
        viewBox="0 0 17 11"
        fill="currentColor"
        className="opacity-90"
      >
        <rect x="0" y="7" width="3" height="4" rx="0.5" />
        <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
        <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
        <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
      </svg>
      {/* Wifi */}
      <svg
        width="16"
        height="11"
        viewBox="0 0 16 11"
        fill="currentColor"
        className="opacity-90"
      >
        <path d="M8 10.2 6 8.2a2.83 2.83 0 0 1 4 0l-2 2zM3.5 5.7A6.37 6.37 0 0 1 8 3.85 6.37 6.37 0 0 1 12.5 5.7l-1.4 1.4A4.37 4.37 0 0 0 8 5.85a4.37 4.37 0 0 0-3.1 1.25zM0 2.3A11.38 11.38 0 0 1 8 -1a11.38 11.38 0 0 1 8 3.3l-1.4 1.4A9.38 9.38 0 0 0 8 1 9.38 9.38 0 0 0 1.4 3.7z" />
      </svg>
      {/* Battery */}
      <svg
        width="27"
        height="12"
        viewBox="0 0 27 12"
        fill="none"
        className="opacity-90"
      >
        <rect
          x="0.5"
          y="0.5"
          width="22"
          height="11"
          rx="2.5"
          stroke="currentColor"
          strokeOpacity="0.4"
        />
        <rect
          x="2"
          y="2"
          width="17.5"
          height="8"
          rx="1.5"
          fill="currentColor"
        />
        <rect
          x="24"
          y="4"
          width="2"
          height="4"
          rx="0.5"
          fill="currentColor"
          fillOpacity="0.4"
        />
      </svg>
    </>
  );
}
