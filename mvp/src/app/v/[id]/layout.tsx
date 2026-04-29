"use client";

import { use } from "react";
import { ChatbotFab } from "@/components/visitor/chatbot-fab";

export default function PublicVisitorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-paper text-foreground">
      <main className="mx-auto w-full max-w-[480px] min-h-screen relative pb-[env(safe-area-inset-bottom)]">
        {children}
        <ChatbotFab projectId={id} />
      </main>
    </div>
  );
}
