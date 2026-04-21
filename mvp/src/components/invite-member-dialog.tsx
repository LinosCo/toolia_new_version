"use client";

import { useState } from "react";
import Image from "next/image";
import { UserPlus, Shield, Eye, Mail, Check, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/lib/mock-projects";
import { cn } from "@/lib/utils";

export type TeamRole = "admin" | "visualizzatore";

export interface NewInvite {
  email: string;
  role: TeamRole;
  projectId?: string;
}

export function InviteMemberDialog({
  onInvite,
  triggerLabel = "Invita",
  triggerClassName,
}: {
  onInvite: (invite: NewInvite) => void;
  triggerLabel?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("admin");
  const [projectId, setProjectId] = useState<string>("");

  const reset = () => {
    setEmail("");
    setRole("admin");
    setProjectId("");
  };

  const isValid =
    email.includes("@") && (role === "admin" || projectId.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onInvite({
      email: email.trim(),
      role,
      projectId: role === "visualizzatore" ? projectId : undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 h-9 px-4 rounded-full text-xs font-medium border border-border hover:bg-muted transition-colors"
        }
      >
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        <div className="relative px-6 pt-6 pb-5 bg-sidebar border-b border-border">
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(var(--color-brand) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-brand font-medium">
              <UserPlus className="h-3 w-3" strokeWidth={2} />
              Invito
            </span>
            <DialogHeader className="mt-2 space-y-1">
              <DialogTitle className="font-heading text-3xl italic leading-tight">
                Invita un collaboratore
              </DialogTitle>
              <DialogDescription className="text-sm">
                Riceverà un'email per entrare nel workspace con il ruolo
                assegnato.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="invite-email"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Inserisci l'email"
                className="h-11 pl-10"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Ruolo
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                icon={Shield}
                label="Admin"
                description="Vede e modifica tutto il workspace"
                active={role === "admin"}
                onClick={() => setRole("admin")}
              />
              <RoleCard
                icon={Eye}
                label="Visualizzatore"
                description="Vede solo il progetto assegnato e lascia feedback"
                active={role === "visualizzatore"}
                onClick={() => setRole("visualizzatore")}
              />
            </div>
          </div>

          {role === "visualizzatore" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Progetto assegnato
                </Label>
                {projectId && (
                  <button
                    type="button"
                    onClick={() => setProjectId("")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cambia
                  </button>
                )}
              </div>
              <div className="max-h-[260px] overflow-y-auto -mx-1 px-1 space-y-2">
                {mockProjects.map((p) => {
                  const selected = projectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProjectId(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 pr-3 rounded-xl border text-left transition-colors",
                        selected
                          ? "border-foreground bg-card"
                          : "border-border hover:border-foreground/40 hover:bg-muted/40",
                      )}
                    >
                      <div
                        className="relative h-12 w-16 rounded-lg overflow-hidden shrink-0 bg-muted"
                        style={
                          p.coverImage
                            ? undefined
                            : {
                                background: `linear-gradient(135deg, ${p.coverGradient[0]} 0%, ${p.coverGradient[1]} 100%)`,
                              }
                        }
                      >
                        {p.coverImage && (
                          <Image
                            src={p.coverImage}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate inline-flex items-center gap-1.5">
                          <MapPin
                            className="h-3 w-3 shrink-0"
                            strokeWidth={1.8}
                          />
                          {p.location}
                          <span className="divider-dot" />
                          {p.client}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                          selected
                            ? "bg-brand text-white"
                            : "border border-border",
                        )}
                      >
                        {selected && (
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Il visualizzatore vedrà solo questo progetto e potrà lasciare
                feedback.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-full"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className={cn(
                "rounded-full bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              Invia invito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleCard({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-xl border transition-colors",
        active
          ? "border-foreground bg-card"
          : "border-border hover:border-foreground/40",
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center",
            active ? "bg-brand text-white" : "bg-muted text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </button>
  );
}
