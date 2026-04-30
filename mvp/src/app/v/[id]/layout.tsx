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
    <div className="min-h-screen bg-paper text-foreground">
      <main className="mx-auto w-full max-w-[480px] min-h-screen relative pb-[env(safe-area-inset-bottom)]">
        {!isWelcome && <VisitorMenu basePath={basePath} />}
        {children}
        {!isWelcome && <ScannerFab basePath={basePath} />}
        <ChatbotFab projectId={id} />
      </main>
    </div>
  );
}
