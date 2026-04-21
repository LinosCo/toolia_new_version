"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadProgress } from "@/lib/project-store";

export default function ProjectIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    const { currentStep } = loadProgress(id);
    router.replace(`/progetti/${id}/${currentStep}`);
  }, [id, router]);

  return <div className="min-h-screen bg-paper" />;
}
