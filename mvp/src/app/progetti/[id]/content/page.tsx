import { RetrievalPlayground } from "./retrieval-playground";
import { GeneratePanel } from "./generate-panel";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Content Engine — Retrieval
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interroga la knowledge base verificata del progetto. Ogni risultato
          mostra la pertinenza e la fonte.
        </p>
      </header>
      <RetrievalPlayground projectId={id} />
      <GeneratePanel projectId={id} />
    </main>
  );
}
