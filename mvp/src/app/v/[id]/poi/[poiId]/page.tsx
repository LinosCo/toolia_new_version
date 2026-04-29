"use client";

import { use } from "react";
import { VisitorPoi } from "@/components/visitor/visitor-poi";

export default function PublicVisitorPoi({
  params,
}: {
  params: Promise<{ id: string; poiId: string }>;
}) {
  const { id, poiId } = use(params);
  return (
    <VisitorPoi projectId={id} poiId={poiId} basePath={`/v/${id}`} />
  );
}
