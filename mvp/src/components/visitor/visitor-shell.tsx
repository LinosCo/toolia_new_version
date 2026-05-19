"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Smartphone } from "lucide-react";
import { ChatbotFab } from "@/components/visitor/chatbot-fab";
import { VisitorMenu } from "@/components/visitor/visitor-menu";

type Mode = "public" | "preview";

export function VisitorShell({
  projectId,
  basePath,
  mode,
  children,
}: {
  projectId: string;
  basePath: string;
  mode: Mode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Welcome = entry pulita: hamburger e chatbot fuori.
  // POI detail = ha già il suo back link nel hero, hamburger sarebbe ridondante.
  const isWelcome = pathname === basePath;
  const isPoiDetail = !!pathname?.startsWith(`${basePath}/poi/`);
  const showHamburger = !isWelcome && !isPoiDetail;
  const showChatbot = !isWelcome;

  // preview = anteprima nello Studio, frame iPhone sempre visibile (anche su mobile)
  //           così l'editor vede l'esperienza mobile.
  // public  = link reale per il visitatore: mobile = fullscreen, desktop = bezel.
  const isPreview = mode === "preview";
  const frameAlwaysOn = isPreview;

  // Classi che differenziano i due mode. Estratte qui per leggibilità.
  const outerWrap = isPreview
    ? "min-h-screen bg-[oklch(0.92_0.008_80)] relative overflow-hidden flex flex-col"
    : "min-h-screen bg-paper text-foreground md:bg-[oklch(0.92_0.008_80)] md:flex md:items-start md:justify-center md:py-10 md:px-4 md:relative md:overflow-hidden";

  const bezelWrap = frameAlwaysOn
    ? "relative bg-[#0a0a0a] rounded-[58px] p-[12px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),0_12px_30px_-12px_rgba(0,0,0,0.3)] z-10 w-[402px]"
    : "md:relative md:bg-[#0a0a0a] md:rounded-[58px] md:p-[12px] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),0_12px_30px_-12px_rgba(0,0,0,0.3)] md:z-10 md:w-[402px]";

  const sideBtn = frameAlwaysOn ? "block" : "hidden md:block";

  const screen = frameAlwaysOn
    ? "relative bg-paper w-[378px] h-[820px] rounded-[46px] overflow-hidden"
    : "relative bg-paper mx-auto w-full max-w-[480px] min-h-screen md:max-w-none md:w-[378px] md:h-[820px] md:min-h-0 md:rounded-[46px] md:overflow-hidden";

  // Scroll wrapper. Su public-mobile lo scroll è quello di pagina, su preview e
  // public-desktop lo scroll è interno al frame.
  const scrollWrap = frameAlwaysOn
    ? "absolute inset-0 overflow-y-auto overscroll-contain [&>*]:min-h-full"
    : "md:absolute md:inset-0 md:overflow-y-auto md:overscroll-contain md:[&>*]:min-h-full pb-[env(safe-area-inset-bottom)]";

  // Overlay/status-bar/dynamic-island: in preview sempre on, in public solo md:
  const onlyFramed = frameAlwaysOn ? "block" : "hidden md:block";
  const onlyFramedFlex = frameAlwaysOn ? "flex" : "hidden md:flex";

  return (
    <div className={outerWrap}>
      {/* Ambient texture — sempre in preview, solo desktop in public */}
      <div
        className={`${onlyFramed} absolute inset-0 pointer-events-none opacity-[0.06]`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.5_0.1_40) 0%, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.4_0.08_60) 0%, transparent 40%)",
        }}
      />

      {/* Top bar — solo in preview: link 'Torna allo Studio' + hint */}
      {isPreview && (
        <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-5 shrink-0">
          <Link
            href={`/progetti/${projectId}/pubblica`}
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
      )}

      {/* Centro device in preview; in public il flex parent fa già il lavoro */}
      <div
        className={
          isPreview
            ? "relative z-10 flex-1 flex items-start justify-center pt-2 pb-16 px-4"
            : "contents"
        }
      >
        <div className={bezelWrap}>
          {/* Side buttons decorativi */}
          <span
            className={`${sideBtn} absolute top-24 -left-[3px] w-[3px] h-10 bg-[#1a1a1a] rounded-l`}
          />
          <span
            className={`${sideBtn} absolute top-40 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l`}
          />
          <span
            className={`${sideBtn} absolute top-60 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l`}
          />
          <span
            className={`${sideBtn} absolute top-32 -right-[3px] w-[3px] h-20 bg-[#1a1a1a] rounded-r`}
          />

          <main className={screen}>
            {/* Content scroll wrapper. Niente pt-[44px]: così le foto hero
                immersive si estendono sotto la status bar (gradient overlay
                garantisce leggibilità). */}
            <div className={scrollWrap}>{children}</div>

            {/* Gradient overlay leggibilità status bar */}
            <div
              className={`${onlyFramed} absolute top-0 left-0 right-0 h-[68px] bg-gradient-to-b from-black/35 via-black/15 to-transparent z-40 pointer-events-none`}
            />

            {/* Dynamic Island */}
            <div
              className={`${onlyFramed} absolute top-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-50 pointer-events-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]`}
            />

            {/* Status bar fake (9:41 + icone iOS). Bianca con text-shadow per
                leggibilità su qualsiasi sfondo. px-12 per non finire dietro al
                border-radius del frame. */}
            <div
              className={`${onlyFramedFlex} absolute top-0 left-0 right-0 h-[44px] items-center justify-between px-12 text-[13px] font-semibold text-white z-40 pointer-events-none [text-shadow:_0_1px_2px_rgba(0,0,0,0.45)] [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]`}
            >
              <span className="tabular-nums">9:41</span>
              <span className="flex items-center gap-1.5">
                <StatusIcons />
              </span>
            </div>

            {showHamburger && <VisitorMenu basePath={basePath} />}
            {showChatbot && <ChatbotFab projectId={projectId} />}
          </main>
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
