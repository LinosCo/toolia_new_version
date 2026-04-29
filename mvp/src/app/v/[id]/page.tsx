"use client";

import { use } from "react";
import { VisitorHome } from "@/components/visitor/visitor-home";

export default function PublicVisitorHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VisitorHome projectId={id} basePath={`/v/${id}`} />;
}
