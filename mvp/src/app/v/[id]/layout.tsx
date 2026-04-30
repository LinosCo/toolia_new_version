"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { ChatbotFab } from "@/components/visitor/chatbot-fab";
import { ScannerFab } from "@/components/visitor/scanner-fab";
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

  // Nascondi shell condiviso solo sulla welcome (entry "pulita")
  const isWelcome = pathname === basePath;

  return (
    <div className="min-h-screen bg-paper text-foreground md:bg-[oklch(0.92_0.008_80)] md:flex md:items-start md:justify-center md:py-10 md:px-4 md:relative md:overflow-hidden">
      {/* Ambient texture solo desktop */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.5 0.1 40) 0%, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.4 0.08 60) 0%, transparent 40%)",
        }}
      />

      {/* Device bezel solo desktop */}
      <div className="md:relative md:bg-[#0a0a0a] md:rounded-[58px] md:p-[12px] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35),0_12px_30px_-12px_rgba(0,0,0,0.3)] md:z-10">
        {/* Side buttons decorativi solo desktop */}
        <span className="hidden md:block absolute top-24 -left-[3px] w-[3px] h-10 bg-[#1a1a1a] rounded-l" />
        <span className="hidden md:block absolute top-40 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l" />
        <span className="hidden md:block absolute top-60 -left-[3px] w-[3px] h-16 bg-[#1a1a1a] rounded-l" />
        <span className="hidden md:block absolute top-32 -right-[3px] w-[3px] h-20 bg-[#1a1a1a] rounded-r" />

        <main className="mx-auto w-full max-w-[480px] min-h-screen relative pb-[env(safe-area-inset-bottom)] bg-paper md:max-w-none md:w-[378px] md:h-[820px] md:min-h-0 md:rounded-[46px] md:overflow-hidden md:overflow-y-auto md:overscroll-contain">
          {/* Dynamic island solo desktop */}
          <div className="hidden md:block sticky top-0 left-0 right-0 h-0 z-50 pointer-events-none">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full shadow-inner" />
          </div>

          {!isWelcome && <VisitorMenu basePath={basePath} />}
          {children}
          {!isWelcome && <ScannerFab basePath={basePath} />}
          <ChatbotFab projectId={id} />
        </main>
      </div>
    </div>
  );
}
