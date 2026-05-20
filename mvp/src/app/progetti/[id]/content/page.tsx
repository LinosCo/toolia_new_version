import { ContentTabs } from "./content-tabs";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">Genera, gestisci e pianifica i contenuti del progetto.</p>
      </header>
      <ContentTabs projectId={id} />
    </main>
  );
}
