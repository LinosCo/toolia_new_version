"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, MoreHorizontal, ArrowUpRight, Globe } from "lucide-react";
import {
  MockProject,
  projectStatusLabel,
  projectTypeLabel,
} from "@/lib/mock-projects";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusStylesOnImage: Record<MockProject["status"], string> = {
  draft: "bg-white/95 text-foreground backdrop-blur-md",
  in_progress: "bg-brand text-white backdrop-blur-md",
  published: "bg-white/95 text-foreground backdrop-blur-md",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

export function ProjectCard({
  project,
  index = 0,
  onDelete,
}: {
  project: MockProject;
  index?: number;
  onDelete?: (id: string) => void;
}) {
  const totalSteps = 7;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/30 transition-colors"
    >
      {/* Cover */}
      <Link href={`/progetti/${project.id}`} className="block">
        <div
          className="relative aspect-[16/10] overflow-hidden"
          style={
            project.coverImage
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${project.coverGradient[0]} 0%, ${project.coverGradient[1]} 100%)`,
                }
          }
        >
          {project.coverImage ? (
            project.coverImage.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.coverImage}
                alt={project.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <Image
                src={project.coverImage}
                alt={project.name}
                fill
                sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                priority={index < 3}
              />
            )
          ) : (
            <div
              className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "3px 3px",
              }}
            />
          )}
          {/* Overlay for readability — stronger at top + bottom */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

          {/* Top row */}
          <div className="relative flex items-start justify-between p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#1A1615] text-[10px] uppercase tracking-[0.14em] text-white font-medium shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {projectTypeLabel[project.type]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.15)]",
                statusStylesOnImage[project.status],
              )}
            >
              {projectStatusLabel[project.status]}
            </span>
          </div>

          {/* Arrow hover */}
          <div className="absolute bottom-5 right-5 h-9 w-9 rounded-full bg-white/90 text-foreground flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pb-4">
          <h3 className="font-heading text-2xl italic leading-tight tracking-tight text-foreground">
            {project.name}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{project.client}</p>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.6} />
              {project.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" strokeWidth={1.6} />
              {project.languages.join(" · ").toUpperCase()}
            </span>
          </div>
        </div>
      </Link>

      {/* Footer — progress + menu */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-border/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-[3px] w-4 rounded-full transition-colors",
                  i < project.completedSteps ? "bg-brand" : "bg-foreground/15",
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {project.completedSteps}/{totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(project.updatedAt)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Apri progetto</DropdownMenuItem>
              <DropdownMenuItem>Duplica</DropdownMenuItem>
              <DropdownMenuItem>Esporta manifest</DropdownMenuItem>
              <DropdownMenuSeparator />
              {onDelete ? (
                <DropdownMenuItem
                  onClick={() => onDelete(project.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Elimina
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled
                  className="text-muted-foreground cursor-not-allowed"
                >
                  Archivia
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.article>
  );
}
