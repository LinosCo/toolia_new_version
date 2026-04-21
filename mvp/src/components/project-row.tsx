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

const statusStyles: Record<MockProject["status"], string> = {
  draft: "bg-muted text-foreground",
  in_progress: "bg-brand text-white",
  published: "bg-foreground text-background",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function ProjectRow({
  project,
  index = 0,
  onDelete,
}: {
  project: MockProject;
  index?: number;
  onDelete?: (id: string) => void;
}) {
  const totalSteps = 6;

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.03,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative flex items-center gap-5 rounded-xl border border-border bg-card p-4 hover:border-foreground/30 transition-colors"
    >
      {/* Thumb */}
      <Link
        href={`/progetti/${project.id}`}
        className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg"
        style={
          project.coverImage
            ? undefined
            : {
                background: `linear-gradient(135deg, ${project.coverGradient[0]} 0%, ${project.coverGradient[1]} 100%)`,
              }
        }
      >
        {project.coverImage && (
          <Image
            src={project.coverImage}
            alt={project.name}
            fill
            sizes="120px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        )}
      </Link>

      {/* Body */}
      <Link
        href={`/progetti/${project.id}`}
        className="flex-1 min-w-0 flex items-center gap-6"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              {projectTypeLabel[project.type]}
            </span>
          </div>
          <h3 className="font-heading text-xl italic leading-tight tracking-tight truncate">
            {project.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{project.client}</span>
            <span className="divider-dot" />
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <MapPin className="h-3 w-3" strokeWidth={1.8} />
              {project.location}
            </span>
            <span className="divider-dot hidden sm:inline" />
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0">
              <Globe className="h-3 w-3" strokeWidth={1.8} />
              {project.languages.join(" · ").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-[3px] w-4 rounded-full",
                  i < project.completedSteps ? "bg-brand" : "bg-foreground/15",
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {project.completedSteps}/{totalSteps}
          </span>
        </div>

        {/* Status */}
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] font-medium shrink-0",
            statusStyles[project.status],
          )}
        >
          {projectStatusLabel[project.status]}
        </span>

        {/* Date */}
        <span className="hidden md:inline text-xs text-muted-foreground tabular-nums shrink-0 w-12 text-right">
          {formatDate(project.updatedAt)}
        </span>

        {/* Hover arrow */}
        <div className="hidden md:flex h-8 w-8 shrink-0 rounded-full items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors">
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
        </div>
      </Link>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 w-8 shrink-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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
    </motion.article>
  );
}
