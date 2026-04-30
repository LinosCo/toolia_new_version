"use client";

import { use } from "react";
import { VisitorItinerari } from "@/components/visitor/visitor-itinerari";

export default function PublicItinerariPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VisitorItinerari projectId={id} basePath={`/v/${id}`} />;
}
