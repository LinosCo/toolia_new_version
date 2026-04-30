"use client";

import { use } from "react";
import { VisitorMappa } from "@/components/visitor/visitor-mappa";

export default function PublicMappaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VisitorMappa projectId={id} />;
}
