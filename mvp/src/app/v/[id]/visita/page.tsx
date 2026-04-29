"use client";

import { use } from "react";
import { VisitorVisita } from "@/components/visitor/visitor-visita";

export default function PublicVisitorVisita({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VisitorVisita projectId={id} basePath={`/v/${id}`} />;
}
