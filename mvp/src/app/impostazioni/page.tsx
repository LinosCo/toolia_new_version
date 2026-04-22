"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  KeyRound,
  Users2,
  Palette,
  ShieldAlert,
  User,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Volume2,
  Map as MapIcon,
  Download,
  Upload,
  Database,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AppSidebar } from "@/components/app-sidebar";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockProjects } from "@/lib/mock-projects";
import {
  loadApiKeys,
  saveLlmKey,
  saveServiceKey,
  type ServiceKey,
} from "@/lib/api-keys";
import {
  exportAllProjects,
  importProjects,
  type ImportResult,
} from "@/lib/project-store";
import { cn } from "@/lib/utils";

const sections = [
  { id: "profilo", label: "Profilo", icon: User },
  { id: "workspace", label: "Spazio di lavoro", icon: Building2 },
  { id: "api", label: "Chiavi API", icon: KeyRound },
  { id: "team", label: "Team", icon: Users2 },
  { id: "aspetto", label: "Aspetto", icon: Palette },
  { id: "backup", label: "Backup progetti", icon: Database },
  { id: "pericolo", label: "Zona pericolosa", icon: ShieldAlert },
];

export default function ImpostazioniPage() {
  return (
    <div className="flex min-h-screen w-full bg-paper">
      <AppSidebar />

      <main className="flex-1 md:pl-64">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-10 md:py-14">
          {/* Hero */}
          <header className="mb-12 max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Configurazione
            </p>
            <h1 className="font-heading text-5xl md:text-6xl leading-[1.02] tracking-tight">
              <span className="italic">Impostazioni</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-lg">
              Gestisci profilo, team, chiavi API dei provider AI e le preferenze
              dello spazio di lavoro.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-14">
            {/* Section nav */}
            <nav className="lg:sticky lg:top-10 self-start">
              <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-2 px-2">
                {sections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.id} className="shrink-0">
                      <a
                        href={`#${s.id}`}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70 transition-colors",
                          s.id === "pericolo" &&
                            "text-muted-foreground hover:text-destructive",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                        <span>{s.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Content */}
            <div className="space-y-16">
              <ProfileSection />
              <Separator />
              <WorkspaceSection />
              <Separator />
              <ApiKeysSection />
              <Separator />
              <TeamSection />
              <Separator />
              <AppearanceSection />
              <Separator />
              <BackupSection />
              <Separator />
              <DangerZone />
            </div>
          </div>

          <footer className="mt-20 pt-8 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Toolia Studio <span className="divider-dot" /> MVP locale
            </p>
            <p>
              Versione 0.1 <span className="divider-dot" />{" "}
              {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* ───────── Section components ───────── */

function SectionHeader({
  id,
  kicker,
  title,
  description,
}: {
  id: string;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="scroll-mt-10">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
        {kicker}
      </p>
      <h2 className="font-heading text-3xl md:text-4xl italic leading-tight tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-lg">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      {children}
    </div>
  );
}

function ProfileSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        id="profilo"
        kicker="01"
        title="Profilo"
        description="Le informazioni del tuo account personale. Visibili al team."
      />
      <Card>
        <div className="flex items-start gap-6 mb-8">
          <div className="h-20 w-20 rounded-full bg-brand/15 text-brand flex items-center justify-center text-2xl font-medium">
            AB
          </div>
          <div className="flex-1 pt-2">
            <p className="font-heading text-xl italic">Alessandro Borsato</p>
            <p className="text-sm text-muted-foreground">
              Admin · Linos &amp; Co
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 text-xs"
              >
                Cambia foto
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 text-xs text-muted-foreground"
              >
                Rimuovi
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Nome e cognome">
            <Input defaultValue="Alessandro Borsato" className="h-11" />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              defaultValue="social@linosandco.com"
              className="h-11"
            />
          </Field>
          <Field label="Password" hint="Ultimo cambio: 12 marzo 2026">
            <Input
              type="password"
              value="••••••••••••"
              className="h-11 font-mono"
              readOnly
            />
          </Field>
        </div>
      </Card>
    </section>
  );
}

function WorkspaceSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        id="workspace"
        kicker="02"
        title="Spazio di lavoro"
        description="Identità del tuo workspace."
      />
      <Card>
        <Field label="Nome workspace">
          <Input defaultValue="Linos & Co" className="h-11" />
        </Field>
      </Card>
    </section>
  );
}

type LlmProvider = "kimi" | "openai" | "anthropic" | "gemini";

const llmProviders: Record<
  LlmProvider,
  { name: string; short: string; placeholder: string; docsUrl: string }
> = {
  kimi: {
    name: "Kimi (Moonshot)",
    short: "Kimi",
    placeholder: "sk-...",
    docsUrl: "platform.moonshot.ai",
  },
  openai: {
    name: "OpenAI",
    short: "OpenAI",
    placeholder: "sk-proj-...",
    docsUrl: "platform.openai.com",
  },
  anthropic: {
    name: "Anthropic Claude",
    short: "Claude",
    placeholder: "sk-ant-...",
    docsUrl: "console.anthropic.com",
  },
  gemini: {
    name: "Google Gemini",
    short: "Gemini",
    placeholder: "AIza...",
    docsUrl: "aistudio.google.com",
  },
};

function ApiKeysSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        id="api"
        kicker="03"
        title="Chiavi API"
        description="I servizi AI usati da Toolia Studio. Scegli il modello per i contenuti, poi configura voce e mappe."
      />

      <div className="space-y-4">
        <LlmProviderCard />
        <ApiKeyCard
          name="ElevenLabs"
          role="Voce AI per generazione audio"
          icon={Volume2}
          placeholder="sk_eleven_..."
          docsUrl="elevenlabs.io"
          storageKey="elevenlabs"
        />
        <ApiKeyCard
          name="Google Maps"
          role="Mappe e posizione dei POI"
          icon={MapIcon}
          placeholder="AIza..."
          docsUrl="console.cloud.google.com"
          storageKey="googleMaps"
        />
      </div>
    </section>
  );
}

function LlmProviderCard() {
  const [active, setActive] = useState<LlmProvider>("kimi");
  const [keys, setKeys] = useState<Record<LlmProvider, string>>({
    kimi: "",
    openai: "",
    anthropic: "",
    gemini: "",
  });
  const [show, setShow] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const store = loadApiKeys();
    setKeys(store.llm);
  }, []);

  const handleSave = () => {
    saveLlmKey(active, keys[active]);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const current = llmProviders[active];
  const currentKey = keys[active];
  const filled = currentKey.length > 0;
  const configuredCount = Object.values(keys).filter(
    (v) => v.length > 0,
  ).length;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-foreground" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-medium">Modello AI per contenuti</h3>
            {filled && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-brand text-white">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                In uso
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Genera schede, temi e narratori dalle fonti
            <span className="divider-dot" />
            {configuredCount > 0
              ? `${configuredCount} ${
                  configuredCount === 1 ? "configurato" : "configurati"
                }`
              : "Nessuno configurato"}
          </p>

          {/* Provider tabs */}
          <div className="mt-5 inline-flex items-center gap-1.5 p-1.5 rounded-full bg-muted/60 border border-border/60">
            {(Object.keys(llmProviders) as LlmProvider[]).map((p) => {
              const has = keys[p].length > 0;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActive(p)}
                  className={cn(
                    "relative px-5 h-9 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2",
                    active === p
                      ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {has && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  )}
                  {llmProviders[p].short}
                </button>
              );
            })}
          </div>

          {/* Key input */}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Chiave {current.name}
              <span className="normal-case tracking-normal text-muted-foreground">
                <span className="divider-dot" />
                {current.docsUrl}
              </span>
            </p>
            <div className="relative">
              <Input
                value={currentKey}
                onChange={(e) =>
                  setKeys((prev) => ({ ...prev, [active]: e.target.value }))
                }
                type={show ? "text" : "password"}
                placeholder={current.placeholder}
                className="h-11 pr-24 font-mono text-sm"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={show ? "Nascondi chiave" : "Mostra chiave"}
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.6} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.6} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={cn(
                    "h-8 px-3 text-xs rounded-md transition-colors font-medium",
                    savedFlash
                      ? "bg-brand text-white"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {savedFlash ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      Salvata
                    </span>
                  ) : (
                    "Salva"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ApiKeyCard({
  name,
  role,
  icon: Icon,
  placeholder,
  docsUrl,
  optional,
  extra,
  storageKey,
}: {
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  placeholder: string;
  docsUrl: string;
  optional?: boolean;
  extra?: React.ReactNode;
  storageKey: ServiceKey;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const filled = value.length > 0;

  useEffect(() => {
    const store = loadApiKeys();
    setValue(store[storageKey] ?? "");
  }, [storageKey]);

  const handleSave = () => {
    saveServiceKey(storageKey, value);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-foreground" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-medium">{name}</h3>
            {optional && (
              <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Opzionale
              </span>
            )}
            {filled && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                <Check className="h-3 w-3" strokeWidth={2} />
                Attiva
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {role} <span className="divider-dot" /> {docsUrl}
          </p>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                className="h-11 pr-24 font-mono text-sm"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.6} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.6} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={cn(
                    "h-8 px-3 text-xs rounded-md transition-colors font-medium",
                    savedFlash
                      ? "bg-brand text-white"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {savedFlash ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      Salvata
                    </span>
                  ) : (
                    "Salva"
                  )}
                </button>
              </div>
            </div>
            {extra}
          </div>
        </div>
      </div>
    </Card>
  );
}

type TeamMember = {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "visualizzatore";
  projectId?: string;
  status: "active" | "pending";
};

function initialsOf(emailOrName: string) {
  const src = emailOrName.split("@")[0];
  const parts = src.split(/[.\-_ ]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: "me",
      name: "Alessandro Borsato",
      email: "social@linosandco.com",
      role: "admin",
      status: "active",
    },
  ]);

  const addMember = (invite: {
    email: string;
    role: "admin" | "visualizzatore";
    projectId?: string;
  }) => {
    setMembers((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        email: invite.email,
        role: invite.role,
        projectId: invite.projectId,
        status: "pending",
      },
    ]);
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const changeRole = (id: string, role: "admin" | "visualizzatore") => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              role,
              projectId: role === "admin" ? undefined : m.projectId,
            }
          : m,
      ),
    );
  };

  const changeProject = (id: string, projectId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, projectId } : m)),
    );
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        id="team"
        kicker="04"
        title="Team"
        description="Invita collaboratori. Scegli il ruolo: Admin ha pieno accesso, Visualizzatore vede solo il progetto assegnato."
      />
      <Card>
        <ul className="divide-y divide-border/60 -my-2">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              onRemove={removeMember}
              onChangeRole={changeRole}
              onChangeProject={changeProject}
            />
          ))}

          {/* Invite row */}
          <li className="py-3 flex items-center gap-4 last:pb-0">
            <div className="h-10 w-10 rounded-full bg-transparent border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
              <UserPlusIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">
                Aggiungi un collaboratore
              </p>
              <p className="text-xs text-muted-foreground">
                Invio via email con ruolo e progetto assegnato
              </p>
            </div>
            <InviteMemberDialog onInvite={addMember} />
          </li>
        </ul>
      </Card>
    </section>
  );
}

function UserPlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function MemberRow({
  member,
  onRemove,
  onChangeRole,
  onChangeProject,
}: {
  member: TeamMember;
  onRemove: (id: string) => void;
  onChangeRole: (id: string, role: "admin" | "visualizzatore") => void;
  onChangeProject: (id: string, projectId: string) => void;
}) {
  const project = member.projectId
    ? mockProjects.find((p) => p.id === member.projectId)
    : undefined;
  const isSelf = member.id === "me";

  return (
    <li className="py-3 flex items-center gap-4 first:pt-0">
      <div className="h-10 w-10 rounded-full bg-brand/15 text-brand flex items-center justify-center text-sm font-medium shrink-0">
        {initialsOf(member.name ?? member.email)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {member.name ?? member.email}
          </p>
          {member.status === "pending" && (
            <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              In attesa
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {member.name ? member.email : ""}
          {project && (
            <>
              {member.name && <span className="divider-dot" />}
              Progetto: <span className="text-foreground">{project.name}</span>
            </>
          )}
        </p>
      </div>

      {isSelf ? (
        <span className="text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full bg-foreground text-background font-medium">
          Admin
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full font-medium transition-colors",
                member.role === "admin"
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-brand/10 text-brand hover:bg-brand/15",
              )}
            >
              {member.role === "admin" ? "Admin" : "Visualizzatore"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Ruolo
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onChangeRole(member.id, "admin")}
                  className="justify-between"
                >
                  Admin
                  {member.role === "admin" && (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onChangeRole(member.id, "visualizzatore")}
                  className="justify-between"
                >
                  Visualizzatore
                  {member.role === "visualizzatore" && (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {member.role === "visualizzatore" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Progetto assegnato
                    </DropdownMenuLabel>
                    {mockProjects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => onChangeProject(member.id, p.id)}
                        className="justify-between"
                      >
                        <span className="truncate">{p.name}</span>
                        {member.projectId === p.id && (
                          <Check
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={2}
                          />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRemove(member.id)}
                className="text-destructive focus:text-destructive"
              >
                Rimuovi dal team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </li>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Chiaro", preview: "bg-[#FAF9F7]" },
    { value: "dark", label: "Scuro", preview: "bg-[#1A1615]" },
    {
      value: "system",
      label: "Sistema",
      preview: "bg-gradient-to-br from-[#FAF9F7] to-[#1A1615]",
    },
  ];

  return (
    <section className="space-y-6">
      <SectionHeader
        id="aspetto"
        kicker="05"
        title="Aspetto"
        description="Scegli il tema dell'interfaccia."
      />
      <Card>
        <Field label="Tema">
          <div className="grid grid-cols-3 gap-3 mt-1">
            {options.map((o) => {
              const active = theme === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTheme(o.value)}
                  className={cn(
                    "relative p-4 rounded-xl border text-left transition-colors",
                    active
                      ? "border-foreground bg-card"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <div
                    className={cn(
                      "h-16 rounded-lg mb-3 border border-border",
                      o.preview,
                    )}
                  />
                  <p className="text-sm font-medium">{o.label}</p>
                  {active && (
                    <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>
      </Card>
    </section>
  );
}

function BackupSection() {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy("export");
    setError(null);
    setResult(null);
    try {
      const backup = await exportAllProjects();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `toolia-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore export");
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (file: File) => {
    setBusy("import");
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const mode = window.confirm(
        "Un progetto con lo stesso ID esiste già nel browser: vuoi SOVRASCRIVERLO con il file importato?\n\nOK = sovrascrivi · Annulla = salta i duplicati",
      )
        ? "replace"
        : "merge";
      const res = await importProjects(raw, mode);
      setResult(res);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "File non valido o danneggiato",
      );
    } finally {
      setBusy(null);
    }
  };

  const fileInputId = "import-backup-input";

  return (
    <section className="space-y-6">
      <SectionHeader
        id="backup"
        kicker="06"
        title="Backup dei progetti"
        description="Esporta tutti i progetti (Fonti, Brief, Luogo, Driver e Personas) + le chiavi API in un file JSON. Importa il file su un altro browser o dispositivo per ritrovare tutto."
      />
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
        <AlertCircle
          className="h-4 w-4 text-amber-700 shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Il file contiene le tue chiavi API</strong> (OpenAI, Google
          Maps, ElevenLabs). Conservalo in un posto sicuro, non condividerlo
          pubblicamente e non committarlo su git.
        </p>
      </div>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/70 bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-foreground" strokeWidth={1.8} />
              <p className="text-sm font-medium">Esporta tutti i progetti</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scarica un file JSON con tutti i progetti del browser corrente.
              Nessun dato viene inviato online.
            </p>
            <Button
              type="button"
              onClick={handleExport}
              disabled={busy !== null}
              className="self-start"
            >
              {busy === "export" ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-1 animate-spin"
                    strokeWidth={1.8}
                  />
                  Esporto…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" strokeWidth={1.8} />
                  Scarica backup JSON
                </>
              )}
            </Button>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-foreground" strokeWidth={1.8} />
              <p className="text-sm font-medium">Importa backup</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Carica un file JSON esportato da un altro browser. I progetti
              esistenti restano: decidi caso per caso se sovrascrivere.
            </p>
            <label
              htmlFor={fileInputId}
              className={cn(
                "self-start inline-flex items-center gap-1 h-10 px-4 rounded-full text-sm font-medium cursor-pointer transition-colors",
                busy
                  ? "bg-muted text-muted-foreground cursor-wait"
                  : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              {busy === "import" ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-1 animate-spin"
                    strokeWidth={1.8}
                  />
                  Importo…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" strokeWidth={1.8} />
                  Scegli file JSON
                </>
              )}
              <input
                id={fileInputId}
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-destructive shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/[0.04] p-4 flex items-start gap-3">
            <Check
              className="h-4 w-4 text-brand shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                Import completato: {result.imported} importati ·{" "}
                {result.skipped} saltati
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-xs text-destructive space-y-0.5">
                  {result.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
              {result.imported > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ricarica la dashboard per vedere i progetti importati.
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function DangerZone() {
  return (
    <section className="space-y-6">
      <SectionHeader
        id="pericolo"
        kicker="07"
        title="Zona pericolosa"
        description="Azioni irreversibili. Procedi solo se sai cosa stai facendo."
      />
      <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.02] p-6 md:p-8 space-y-4">
        <DangerRow
          title="Archivia workspace"
          description="Nasconde il workspace e tutti i progetti. Reversibile entro 30 giorni."
          action="Archivia"
        />
        <Separator className="bg-destructive/20" />
        <DangerRow
          title="Elimina workspace"
          description="Cancella permanentemente workspace, progetti, audio. Non recuperabile."
          action="Elimina"
          destructive
        />
      </div>
    </section>
  );
}

function DangerRow({
  title,
  description,
  action,
  destructive,
}: {
  title: string;
  description: string;
  action: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "rounded-full h-9 text-xs border-destructive/30",
          destructive
            ? "bg-destructive text-white hover:bg-destructive/90 border-destructive"
            : "text-destructive hover:bg-destructive/10",
        )}
      >
        {action}
      </Button>
    </div>
  );
}
