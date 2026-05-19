"use client";

import { use } from "react";
import { VisitorShell } from "@/components/visitor/visitor-shell";

export default function PublicVisitorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <VisitorShell projectId={id} basePath={`/v/${id}`} mode="public">
      {children}
    </VisitorShell>
  );
}
