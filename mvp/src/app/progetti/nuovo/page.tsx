"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Home,
  Landmark,
  Wine,
  Building2,
  Trees,
  Map as MapIcon,
  Sparkles,
  Check,
  MapPin,
  ImagePlus,
  Trash2,
  Replace,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapsPreview } from "@/components/maps-preview";
import { loadApiKeys } from "@/lib/api-keys";
import { cn } from "@/lib/utils";
import { ProjectType } from "@/lib/mock-projects";

type Step = 0 | 1 | 2 | 3;

async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no-canvas-ctx"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const typeOptions: {
  value: ProjectType;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description: string;
}[] = [
  {
    value: "villa",
    label: "Villa",
    icon: Home,
    description: "Dimore storiche aperte al pubblico",
  },
  {
    value: "museo",
    label: "Museo",
    icon: Landmark,
    description: "Collezioni e mostre",
  },
  {
    value: "cantina",
    label: "Cantina",
    icon: Wine,
    description: "Vigneti, cantine, tour produttivi",
  },
  {
    value: "citta",
    label: "Città",
    icon: Building2,
    description: "Percorsi urbani, borghi, quartieri",
  },
  {
    value: "parco",
    label: "Parco",
    icon: Trees,
    description: "Giardini, aree verdi, parchi naturali",
  },
  {
    value: "territorio",
    label: "Territorio",
    icon: MapIcon,
    description: "Regioni, aree vaste, itinerari diffusi",
  },
  {
    value: "altro",
    label: "Altro",
    icon: Sparkles,
    description: "Altra tipologia di sito culturale",
  },
];

const typeLabel: Record<ProjectType, string> = {
  villa: "Villa",
  museo: "Museo",
  cantina: "Cantina",
  citta: "Città",
  parco: "Parco",
  territorio: "Territorio",
  altro: "Altro",
};

interface FormData {
  name: string;
  type: ProjectType | null;
  coverImage: string | null;
  address: string;
  mapsLink: string;
  city: string;
}

export default function NuovoProgettoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<FormData>({
    name: "",
    type: null,
    coverImage: null,
    address: "",
    mapsLink: "",
    city: "",
  });

  // address → mapsLink via forward geocoding (only if mapsLink empty)
  useEffect(() => {
    if (!data.address.trim() || data.mapsLink.trim()) return;
    const key = loadApiKeys().googleMaps;
    if (!key) return;
    const addr = data.address.trim();
    if (addr.length < 4) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            addr,
          )}&key=${key}&language=it`,
          { signal: controller.signal },
        );
        const json = await res.json();
        const result = json?.results?.[0];
        const loc = result?.geometry?.location;
        if (loc) {
          const components = result?.address_components ?? [];
          const cityTypes = [
            "locality",
            "administrative_area_level_3",
            "administrative_area_level_2",
            "postal_town",
          ];
          let foundCity: string | undefined;
          for (const t of cityTypes) {
            const c = components.find((x: { types: string[] }) =>
              x.types.includes(t),
            );
            if (c) {
              foundCity = c.long_name;
              break;
            }
          }
          setData((d) => ({
            ...d,
            mapsLink:
              d.mapsLink.trim() ||
              `https://www.google.com/maps/@${loc.lat},${loc.lng},17z`,
            city: d.city || foundCity || d.city,
          }));
        }
      } catch {
        // ignore
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [data.address, data.mapsLink]);

  // mapsLink resolved → fill address + city if empty
  const handleMapsResolved = (info: { address?: string; city?: string }) => {
    setData((d) => ({
      ...d,
      address: d.address.trim() || info.address || d.address,
      city: d.city || info.city || d.city,
    }));
  };

  const canProceed =
    (step === 0 && data.name.trim().length >= 2) ||
    (step === 1 && data.type !== null) ||
    step === 2 ||
    step === 3;

  const next = () => {
    if (!canProceed) return;
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const back = () => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createProject = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          type: data.type,
          coverImage: data.coverImage,
          address: data.address.trim() || null,
          mapsLink: data.mapsLink.trim() || null,
          city: data.city.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError(
          json?.error === "unauthorized"
            ? "Sessione scaduta. Ricarica la pagina."
            : "Creazione non riuscita. Riprova.",
        );
        setSubmitting(false);
        return;
      }
      const { project } = (await res.json()) as { project: { id: string } };
      router.push(`/progetti/${project.id}`);
    } catch {
      setSubmitError("Errore di rete. Riprova.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-paper flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-10 h-16 shrink-0">
        <Link
          href="/"
          className="inline-flex items-baseline gap-1 group"
          aria-label="Torna alla dashboard"
        >
          <span className="font-heading text-xl italic leading-none text-foreground">
            Toolia
          </span>
          <span className="h-1 w-1 rounded-full bg-brand translate-y-[-2px]" />
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          Annulla
        </Link>
      </header>

      {/* Progress */}
      <div className="flex items-center justify-center pt-6 pb-2">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => {
            const isDone = step > i;
            const isCurrent = step === i;
            return (
              <span
                key={i}
                className={cn(
                  "h-[3px] rounded-full transition-all duration-500",
                  isDone
                    ? "w-8 bg-foreground"
                    : isCurrent
                      ? "w-12 bg-brand"
                      : "w-8 bg-foreground/15",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8 pb-10">
        <div className="w-full max-w-[640px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepShell
                key="0"
                kicker="Passo 1 di 4"
                title="Come si chiama?"
                subtitle="Dai un nome al progetto. Potrai cambiarlo in qualsiasi momento."
              >
                <div className="space-y-2">
                  <Input
                    autoFocus
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed) next();
                    }}
                    placeholder="Villa La Rotonda"
                    className="h-14 text-2xl font-heading italic border-0 border-b-2 border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground bg-transparent"
                  />
                  <p className="text-xs text-muted-foreground">
                    Di solito è il nome del luogo o della collezione.
                  </p>
                </div>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell
                key="1"
                kicker="Passo 2 di 4"
                title="Che tipo di luogo è?"
                subtitle="Serve per adattare il tono e le funzioni dell'app ai visitatori."
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {typeOptions.map((t) => {
                    const Icon = t.icon;
                    const selected = data.type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setData({ ...data, type: t.value })}
                        className={cn(
                          "group relative text-left p-5 rounded-2xl border transition-all",
                          selected
                            ? "border-foreground bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                            : "border-border hover:border-foreground/40 hover:bg-card",
                        )}
                      >
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                            selected
                              ? "bg-brand text-white"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.6} />
                        </div>
                        <p className="font-heading text-xl italic leading-tight">
                          {t.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {t.description}
                        </p>
                        {selected && (
                          <span className="absolute top-4 right-4 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center">
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                key="2"
                kicker="Passo 3 di 4"
                title="Foto e posizione"
                subtitle="Opzionali. Aiutano a riconoscere il luogo nell'anteprima e a dare contesto alla AI."
              >
                <div className="space-y-6">
                  <PhotoUploader
                    value={data.coverImage}
                    onChange={(img) =>
                      setData((d) => ({ ...d, coverImage: img }))
                    }
                  />

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Indirizzo
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={data.address}
                        onChange={(e) =>
                          setData((d) => ({ ...d, address: e.target.value }))
                        }
                        placeholder="Via Valmarana 3, Vicenza"
                        className="h-12 text-base pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Link Google Maps{" "}
                      <span className="normal-case tracking-normal text-muted-foreground">
                        · opzionale
                      </span>
                    </Label>
                    <Input
                      value={data.mapsLink}
                      onChange={(e) =>
                        setData((d) => ({ ...d, mapsLink: e.target.value }))
                      }
                      placeholder="https://maps.app.goo.gl/…"
                      className="h-12 text-base font-mono"
                    />
                    {data.mapsLink && (
                      <MapsPreview
                        link={data.mapsLink}
                        onResolved={handleMapsResolved}
                      />
                    )}
                  </div>
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell
                key="3"
                kicker="Tutto pronto"
                title="Creiamo il progetto"
                subtitle="Potrai raffinare ogni dettaglio nei passaggi di inserimento dati."
              >
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {data.coverImage && (
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.coverImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 space-y-5">
                    <RecapRow label="Nome">
                      <span className="font-heading text-xl italic">
                        {data.name}
                      </span>
                    </RecapRow>
                    <div className="border-t border-border/60" />
                    <RecapRow label="Tipo">
                      <span className="inline-flex items-center gap-2 text-sm">
                        {data.type && (
                          <>
                            <TypeIcon type={data.type} />
                            {typeLabel[data.type]}
                          </>
                        )}
                      </span>
                    </RecapRow>
                    {data.address && (
                      <>
                        <div className="border-t border-border/60" />
                        <RecapRow label="Indirizzo">
                          <span className="inline-flex items-center gap-1.5 text-sm text-right">
                            <MapPin
                              className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                              strokeWidth={1.8}
                            />
                            {data.address}
                          </span>
                        </RecapRow>
                      </>
                    )}
                    {data.mapsLink && (
                      <>
                        <div className="border-t border-border/60" />
                        <RecapRow label="Link Maps">
                          <span className="text-xs text-muted-foreground truncate max-w-[220px] inline-block">
                            {data.mapsLink.replace(/^https?:\/\//, "")}
                          </span>
                        </RecapRow>
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-6 text-xs text-muted-foreground text-center">
                  Dopo la creazione ti guideremo passo per passo
                  nell'inserimento dei dati per generare l'audioguida.
                </p>
              </StepShell>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom actions */}
      <footer className="shrink-0 border-t border-border/60 bg-paper">
        <div className="mx-auto max-w-[640px] px-6 py-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium transition-colors",
              step === 0
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-foreground hover:bg-muted",
            )}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Indietro
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className={cn(
                "inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium transition-all",
                canProceed
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              Avanti
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}
              <button
                type="button"
                onClick={createProject}
                disabled={submitting}
                className={cn(
                  "inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
                  submitting
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : "bg-brand text-white hover:bg-brand/90",
                )}
              >
                {submitting ? "Creazione…" : "Crea progetto"}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function StepShell({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      <header className="space-y-3 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {kicker}
        </p>
        <h1 className="font-heading text-5xl md:text-6xl italic leading-[1.02] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            {subtitle}
          </p>
        )}
      </header>

      <div>{children}</div>
    </motion.section>
  );
}

function RecapRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground pt-1">
        {label}
      </p>
      <div className="text-right">{children}</div>
    </div>
  );
}

function TypeIcon({ type }: { type: ProjectType }) {
  const entry = typeOptions.find((t) => t.value === type);
  if (!entry) return null;
  const Icon = entry.icon;
  return <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />;
}

function PhotoUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2 block">
        Foto del luogo
      </Label>

      {value ? (
        <div className="relative rounded-2xl overflow-hidden aspect-[16/10] border border-border group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Anteprima foto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/95 text-foreground text-xs font-medium hover:bg-white transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
            >
              <Replace className="h-3.5 w-3.5" strokeWidth={1.8} />
              Cambia
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/95 text-destructive hover:bg-white transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
              aria-label="Rimuovi foto"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          disabled={busy}
          className={cn(
            "w-full aspect-[16/10] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
            dragOver
              ? "border-foreground bg-card"
              : "border-border hover:border-foreground/40 hover:bg-card/60 text-muted-foreground hover:text-foreground",
            busy && "opacity-60 cursor-wait",
          )}
        >
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-1">
            <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground">
            {busy ? "Caricamento…" : "Carica una foto del luogo"}
          </p>
          <p className="text-xs text-muted-foreground">
            Trascina qui o clicca per selezionare
          </p>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
