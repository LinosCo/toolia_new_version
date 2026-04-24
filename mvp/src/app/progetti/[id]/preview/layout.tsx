"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-paper">
      <div className="fixed top-4 left-4 z-50">
        <Link
          href={`/progetti/${id}/pubblica`}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground/85 backdrop-blur text-background text-xs font-medium hover:bg-foreground transition-colors shadow-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Torna allo Studio
        </Link>
      </div>
      {children}
      <ChatbotFab projectId={id} />
    </div>
  );
}
