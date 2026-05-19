"use client";

import { use } from "react";
import { VisitorScegli } from "@/components/visitor/visitor-scegli";

export default function PreviewScegliPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VisitorScegli basePath={`/progetti/${id}/preview`} />;
}
