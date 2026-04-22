"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function SigninForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("resend", { email, callbackUrl });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif text-foreground">Toolia Studio</h1>
          <p className="text-sm text-foreground/60">
            Inserisci la tua email per ricevere il link di accesso
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error === "Verification"
              ? "Link scaduto o già usato. Richiedi un nuovo link."
              : `Errore: ${error}`}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
              className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="tu@esempio.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? "Invio..." : "Invia link di accesso"}
          </button>
        </form>

        <p className="text-xs text-center text-foreground/50">
          Accesso solo su invito. Se non hai un account, contatta l&apos;admin.
        </p>
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SigninForm />
    </Suspense>
  );
}
