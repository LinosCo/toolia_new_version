"use client";

import { use } from "react";
import { VisitorCrea } from "@/components/visitor/visitor-crea";

export default function PublicVisitorCrea({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VisitorCrea projectId={id} basePath={`/v/${id}`} />;
}
