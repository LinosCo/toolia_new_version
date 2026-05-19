"use client";

import { use } from "react";
import { VisitorItinerari } from "@/components/visitor/visitor-itinerari";

export default function PreviewItinerariPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <VisitorItinerari projectId={id} basePath={`/progetti/${id}/preview`} />
  );
}
