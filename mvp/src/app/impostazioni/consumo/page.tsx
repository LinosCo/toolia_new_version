"use client";

import useSWR from "swr";

interface UsageData {
  totalUsd: number;
  byOperation: Record<string, { count: number; costUsd: number }>;
  byProject: Array<{
    projectId: string | null;
    projectName: string | null;
    count: number;
    costUsd: number;
  }>;
  records: Array<{
    id: string;
    operation: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    audioSeconds: number;
    costUsd: number;
    projectId: string | null;
    createdAt: string;
  }>;
  from: string;
  to: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConsumoPage() {
  const { data, isLoading, error } = useSWR<UsageData>("/api/tenant/usage", fetcher);

  if (isLoading) return <div className="p-6">Caricamento...</div>;
  if (error) return <div className="p-6 text-red-600">Errore: {String(error)}</div>;
  if (!data) return <div className="p-6">Nessun dato</div>;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-2">Consumo AI</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Ultimi 30 giorni · costi stimati basati su pricing pubblico dei provider
      </p>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="text-sm text-muted-foreground">Totale periodo</div>
        <div className="text-4xl font-bold">${data.totalUsd.toFixed(2)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-medium mb-3">Per operazione</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Operazione</th>
                <th className="py-2 pr-4 text-right">Chiamate</th>
                <th className="py-2 text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byOperation)
                .sort(([, a], [, b]) => b.costUsd - a.costUsd)
                .map(([op, v]) => (
                  <tr key={op} className="border-t">
                    <td className="py-2 pr-4 font-mono text-xs">{op}</td>
                    <td className="py-2 pr-4 text-right">{v.count}</td>
                    <td className="py-2 text-right">${v.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-3">Per progetto</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Progetto</th>
                <th className="py-2 pr-4 text-right">Chiamate</th>
                <th className="py-2 text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {data.byProject
                .sort((a, b) => b.costUsd - a.costUsd)
                .map((p) => (
                  <tr key={p.projectId ?? "tenant"} className="border-t">
                    <td className="py-2 pr-4">
                      {p.projectName ?? <span className="text-muted-foreground italic">(senza progetto)</span>}
                    </td>
                    <td className="py-2 pr-4 text-right">{p.count}</td>
                    <td className="py-2 text-right">${p.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-lg font-medium mb-3">Ultime 100 chiamate</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Data</th>
            <th className="py-2 pr-4">Operazione</th>
            <th className="py-2 pr-4">Provider · Modello</th>
            <th className="py-2 pr-4 text-right">Input</th>
            <th className="py-2 pr-4 text-right">Output</th>
            <th className="py-2 text-right">Costo</th>
          </tr>
        </thead>
        <tbody>
          {data.records.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2 pr-4 text-xs">{new Date(r.createdAt).toLocaleString("it-IT")}</td>
              <td className="py-2 pr-4 font-mono text-xs">{r.operation}</td>
              <td className="py-2 pr-4 text-xs">{r.provider} · {r.model}</td>
              <td className="py-2 pr-4 text-right">{r.inputTokens || (r.audioSeconds ? `${r.audioSeconds}s` : "-")}</td>
              <td className="py-2 pr-4 text-right">{r.outputTokens || "-"}</td>
              <td className="py-2 text-right">${r.costUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
