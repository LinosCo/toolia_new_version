import { BrandWorkspace } from "./brand-workspace";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Brand Layer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carica gli asset di brand, estrai le evidenze e distilla il BrandSkill: la voce e l&apos;identità visiva del progetto.
        </p>
      </header>
      <BrandWorkspace projectId={id} />
    </main>
  );
}
