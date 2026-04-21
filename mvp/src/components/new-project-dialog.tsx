"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "villa", label: "Villa" },
  { value: "museo", label: "Museo" },
  { value: "cantina", label: "Cantina" },
  { value: "citta", label: "Città" },
  { value: "parco", label: "Parco" },
  { value: "altro", label: "Altro" },
];

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors">
        <Plus className="h-4 w-4" strokeWidth={2} />
        Nuovo progetto
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
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              Nuovo
            </span>
            <DialogHeader className="mt-2 space-y-1">
              <DialogTitle className="font-heading text-3xl italic leading-tight">
                Crea un progetto
              </DialogTitle>
              <DialogDescription className="text-sm">
                Inizia con le informazioni di base. Potrai raffinare tutto dopo.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <form className="px-6 py-6 space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Nome del progetto
            </Label>
            <Input
              id="name"
              placeholder="Villa La Rotonda"
              className="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="type"
                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Tipo di sito
              </Label>
              <Select>
                <SelectTrigger id="type" className="h-11">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="location"
                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Località
              </Label>
              <Input id="location" placeholder="Vicenza" className="h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="client"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Cliente
            </Label>
            <Input
              id="client"
              placeholder="Fondazione Palladio"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="brief"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Due righe sul progetto{" "}
              <span className="normal-case tracking-normal text-muted-foreground">
                (opzionale)
              </span>
            </Label>
            <Textarea
              id="brief"
              placeholder="Cosa racconta questo sito? Chi lo visita?"
              rows={3}
              className="resize-none"
            />
          </div>
        </form>

        <DialogFooter className="px-6 pb-6 pt-2 gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-full"
          >
            Annulla
          </Button>
          <Button
            className={cn(
              "rounded-full bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            Crea progetto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
