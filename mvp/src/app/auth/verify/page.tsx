export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-serif text-foreground">
          Controlla la tua email
        </h1>
        <p className="text-sm text-foreground/60">
          Ti abbiamo inviato un link di accesso. Apri l&apos;email e clicca sul
          link per entrare in Toolia Studio.
        </p>
        <p className="text-xs text-foreground/40">
          Se non vedi l&apos;email, controlla lo spam.
        </p>
      </div>
    </div>
  );
}
