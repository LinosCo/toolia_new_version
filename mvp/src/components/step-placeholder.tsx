"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function StepPlaceholder({
  kicker,
  title,
  description,
  nextHref,
  nextLabel,
}: {
  kicker: string;
  title: string;
  description: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-brand font-medium">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          In arrivo
        </div>
        <h1 className="font-heading text-4xl italic leading-tight tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground pt-2">
          {kicker}
        </p>
        {nextHref && (
          <div className="pt-4">
            <Link
              href={nextHref}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {nextLabel ?? "Continua"}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
