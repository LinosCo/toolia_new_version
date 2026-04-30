"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { ChatbotFab } from "@/components/visitor/chatbot-fab";
import { VisitorMenu } from "@/components/visitor/visitor-menu";

export default function PublicVisitorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const basePath = `/v/${id}`;
  const pathname = usePathname();

  // Welcome = entry pulita, niente shell.
  // POI page = ha già il suo back link nel hero, hamburger sarebbe ridondante.
  const isWelcome = pathname === basePath;
  const isPoiDetail = !!pathname?.startsWith(`${basePath}/poi/`);
  const showHamburger = !isWelcome && !isPoiDetail;

  return (
    <div className="min-h-screen bg-paper text-foreground md:bg-[oklch(0.92_0.008_80)] md:flex md:items-start md:justify-center md:py-10 md:px-4 md:relative md:overflow-hidden">
      {/* Ambient texture — solo desktop */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.5_0.1_40) 0%, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.4_0.08_60) 0%, transparent 40%)",
        }}
      />

      {/* Bezel iPhone — invisibile su mobile, frame nero su desktop */}
      <div className="md:relative md:bg-[#0a0a0a] md:rounded-[58px] md:p-[12px] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),0_12px_30px_-12px_rgba(0,0,0,0.3)] md:z-10 md:w-[402px]">
        {/* Side buttons decorativi — solo desktop */}
        <span className="hidden md:block absolute top-24 -left-[3px] w-[3px] h-10 bg-[#1a1a1a] rounded-l" />
        <span className="hidden md:block absolute top-40 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l" />
        <span className="hidden md:block absolute top-60 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l" />
        <span className="hidden md:block absolute top-32 -right-[3px] w-[3px] h-20 bg-[#1a1a1a] rounded-r" />

        {/* Schermo: il <main> è il device screen.
            Su mobile è la pagina full-screen.
            Su desktop diventa 378×820 rounded, ritagliato dal bezel. */}
        <main className="relative bg-paper mx-auto w-full max-w-[480px] min-h-screen md:max-w-none md:w-[378px] md:h-[820px] md:min-h-0 md:rounded-[46px] md:overflow-hidden">
          {/* Content scroll wrapper.
              Su mobile: <div> trasparente, content scrolla con la pagina.
              Su desktop: absolute inset-0 con scroll interno (niente pt-[44px]
              così foto hero immersive si estendono sotto la status bar).
              [&>*]:min-h-full forza il primo figlio a riempire il content area
              senza usare 100vh (che sforerebbe l'altezza del frame). */}
          <div className="md:absolute md:inset-0 md:overflow-y-auto md:overscroll-contain md:[&>*]:min-h-full pb-[env(safe-area-inset-bottom)]">
            {children}
          </div>

          {/* Gradient overlay per leggibilità status bar — solo desktop */}
          <div className="hidden md:block absolute top-0 left-0 right-0 h-[68px] bg-gradient-to-b from-black/35 via-black/15 to-transparent z-40 pointer-events-none" />

          {/* Dynamic Island — solo desktop, sopra al content */}
          <div className="hidden md:block absolute top-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-50 pointer-events-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />

          {/* Status bar fake (9:41 + icone iOS) — solo desktop, icone bianche con shadow per leggibilità su qualsiasi sfondo. Padding generoso per non finire dietro al border-radius del frame. */}
          <div className="hidden md:flex absolute top-0 left-0 right-0 h-[44px] items-center justify-between px-12 text-[13px] font-semibold text-white z-40 pointer-events-none [text-shadow:_0_1px_2px_rgba(0,0,0,0.45)] [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            <span className="tabular-nums">9:41</span>
            <span className="flex items-center gap-1.5">
              <StatusIcons />
            </span>
          </div>

          {/* Hamburger menu — ancorato al main. Nascosto su welcome e su POI
              (POI ha già il suo back link nativo nel hero). */}
          {showHamburger && <VisitorMenu basePath={basePath} />}

          {/* Chatbot FAB — nascosto sulla welcome (entry pulita).
              Scanner QR FAB rimosso: feature non ancora implementata
              (camera API + decoder + match POI). Si reintroduce quando
              c'è la route /scanner funzionante. */}
          {!isWelcome && <ChatbotFab projectId={id} />}
        </main>
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
