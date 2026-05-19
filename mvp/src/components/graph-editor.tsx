"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  MapNodeData,
  SegmentData,
  NodeKind,
  SegmentKind,
  GraphData,
} from "@/lib/project-store";
import { loadGraph, saveGraph } from "@/lib/project-store";

interface Props {
  projectId: string;
  planimetriaUrl?: string;
  poiList?: Array<{ id: string; name: string }>;
  onChange?: (g: GraphData) => void;
}

type Mode = "view" | "add_node" | "add_segment";

const NODE_KIND_LABELS: Record<NodeKind, string> = {
  accesso: "Accesso",
  bivio: "Bivio",
  transizione: "Transizione",
  rientro: "Rientro",
};

const NODE_KIND_COLORS: Record<NodeKind, string> = {
  accesso: "#22c55e",
  bivio: "#f59e0b",
  transizione: "#3b82f6",
  rientro: "#a855f7",
};

const SEGMENT_KINDS: SegmentKind[] = [
  "passaggio",
  "ramo",
  "loop",
  "connessione",
];

function genTempId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function GraphEditor({
  projectId,
  planimetriaUrl,
  poiList,
  onChange,
}: Props) {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [selectedNodeKind, setSelectedNodeKind] =
    useState<NodeKind>("transizione");
  const [selectedSegmentKind, setSelectedSegmentKind] =
    useState<SegmentKind>("passaggio");
  const [pendingFromNode, setPendingFromNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [view, setView] = useState<"topological" | "spatial">(
    planimetriaUrl ? "spatial" : "topological",
  );
  const [proposing, setProposing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadGraph(projectId)
      .then((g) => setGraph(g))
      .catch((e) => console.error("Failed to load graph:", e))
      .finally(() => setLoading(false));
  }, [projectId]);

  const persistDebounced = useCallback(
    (g: GraphData) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const saved = await saveGraph(projectId, g);
          setGraph(saved);
          onChange?.(saved);
        } catch (e) {
          console.error("Failed to save graph:", e);
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [projectId, onChange],
  );

  function addNodeAtPosition(x: number, y: number, kind: NodeKind) {
    const node: MapNodeData = {
      id: genTempId(),
      kind,
      planimetriaX: x,
      planimetriaY: y,
      orderIndex: graph.nodes.length,
    };
    const next: GraphData = {
      nodes: [...graph.nodes, node],
      segments: graph.segments,
    };
    setGraph(next);
    persistDebounced(next);
  }

  function startSegmentFromNode(nodeId: string) {
    if (pendingFromNode === nodeId) {
      setPendingFromNode(null);
    } else if (pendingFromNode) {
      const segment: SegmentData = {
        id: genTempId(),
        fromNodeId: pendingFromNode,
        toNodeId: nodeId,
        kind: selectedSegmentKind,
        poiIds: [],
        bidirectional: true,
      };
      const next: GraphData = {
        nodes: graph.nodes,
        segments: [...graph.segments, segment],
      };
      setGraph(next);
      persistDebounced(next);
      setPendingFromNode(null);
    } else {
      setPendingFromNode(nodeId);
    }
  }

  function deleteNode(nodeId: string) {
    if (!confirm("Eliminare il nodo e i segmenti collegati?")) return;
    const next: GraphData = {
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      segments: graph.segments.filter(
        (s) => s.fromNodeId !== nodeId && s.toNodeId !== nodeId,
      ),
    };
    setGraph(next);
    persistDebounced(next);
    setSelectedNodeId(null);
  }

  function updateSelectedNode(patch: Partial<MapNodeData>) {
    if (!selectedNodeId) return;
    const next: GraphData = {
      nodes: graph.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, ...patch } : n,
      ),
      segments: graph.segments,
    };
    setGraph(next);
    persistDebounced(next);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "add_node") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    addNodeAtPosition(x, y, selectedNodeKind);
    setMode("view");
  }

  async function proposeGraph() {
    if (!poiList || poiList.length === 0) {
      alert("Niente POI definiti.");
      return;
    }
    if (
      graph.nodes.length > 0 &&
      !confirm("Esiste già un grafo. Sovrascriverlo con la proposta AI?")
    ) {
      return;
    }
    setProposing(true);
    try {
      const res = await fetch(`/api/ai/propose-graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          poiIds: poiList.map((p) => p.id),
          poisData: poiList.map((p) => ({ id: p.id, name: p.name })),
          provider: "openai",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        alert(`Errore proposta: ${(err.error as string) ?? res.status}`);
        return;
      }
      const proposed = await res.json() as {
        nodes?: Array<{
          tempId?: string;
          id?: string;
          kind: NodeKind;
          lat?: number;
          lng?: number;
          planimetriaX?: number;
          planimetriaY?: number;
          label?: string;
          orderIndex?: number;
        }>;
        segments?: Array<{
          tempId?: string;
          id?: string;
          fromTempId?: string;
          fromNodeId?: string;
          toTempId?: string;
          toNodeId?: string;
          kind: SegmentKind;
          traversalSec?: number;
          detourCost?: number;
          poiIds?: string[];
          bidirectional?: boolean;
          label?: string;
        }>;
      };
      const nodes: MapNodeData[] = (proposed.nodes ?? []).map((n, i) => ({
        id: n.tempId ?? n.id ?? genTempId(),
        kind: n.kind,
        lat: n.lat ?? null,
        lng: n.lng ?? null,
        planimetriaX: n.planimetriaX ?? null,
        planimetriaY: n.planimetriaY ?? null,
        label: n.label ?? null,
        orderIndex: n.orderIndex ?? i,
      }));
      const segments: SegmentData[] = (proposed.segments ?? []).map((s) => ({
        id: s.tempId ?? s.id ?? genTempId(),
        fromNodeId: s.fromTempId ?? s.fromNodeId ?? "",
        toNodeId: s.toTempId ?? s.toNodeId ?? "",
        kind: s.kind,
        traversalSec: s.traversalSec ?? null,
        detourCost: s.detourCost ?? null,
        poiIds: s.poiIds ?? [],
        bidirectional: s.bidirectional ?? true,
        label: s.label ?? null,
      }));
      const next: GraphData = { nodes, segments };
      setGraph(next);
      persistDebounced(next);
    } catch (e) {
      console.error("Failed to propose graph:", e);
      alert("Errore nella proposta del grafo");
    } finally {
      setProposing(false);
    }
  }

  if (loading)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Caricamento grafo...
      </div>
    );

  const selectedNode = selectedNodeId
    ? graph.nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setMode("view");
            setPendingFromNode(null);
          }}
          className={`px-3 py-1.5 rounded text-sm ${
            mode === "view"
              ? "bg-foreground text-background"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Visualizza
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("add_node");
            setPendingFromNode(null);
          }}
          className={`px-3 py-1.5 rounded text-sm ${
            mode === "add_node"
              ? "bg-foreground text-background"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          + Nodo
        </button>
        {mode === "add_node" && (
          <select
            value={selectedNodeKind}
            onChange={(e) => setSelectedNodeKind(e.target.value as NodeKind)}
            className="px-2 py-1.5 rounded text-sm border bg-background"
          >
            {Object.entries(NODE_KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => {
            setMode("add_segment");
            setPendingFromNode(null);
          }}
          className={`px-3 py-1.5 rounded text-sm ${
            mode === "add_segment"
              ? "bg-foreground text-background"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          + Segmento
        </button>
        {mode === "add_segment" && (
          <>
            <select
              value={selectedSegmentKind}
              onChange={(e) =>
                setSelectedSegmentKind(e.target.value as SegmentKind)
              }
              className="px-2 py-1.5 rounded text-sm border bg-background"
            >
              {SEGMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {pendingFromNode
                ? `Da: ${
                    graph.nodes.find((n) => n.id === pendingFromNode)?.label ??
                    "nodo selezionato"
                  } — clicca destinazione`
                : "Clicca il nodo di partenza"}
            </span>
          </>
        )}

        <button
          type="button"
          onClick={proposeGraph}
          disabled={proposing}
          className="ml-2 px-3 py-1.5 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
        >
          {proposing ? "Proposta in corso..." : "✨ Proponi con AI"}
        </button>

        <div className="ml-auto flex gap-1">
          {planimetriaUrl && (
            <button
              type="button"
              onClick={() => setView("spatial")}
              className={`px-3 py-1.5 rounded text-sm ${
                view === "spatial"
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Planimetria
            </button>
          )}
          <button
            type="button"
            onClick={() => setView("topological")}
            className={`px-3 py-1.5 rounded text-sm ${
              view === "topological"
                ? "bg-foreground text-background"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            Logica
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative aspect-[3/2] border rounded-lg overflow-hidden bg-muted"
        style={{ cursor: mode === "add_node" ? "crosshair" : "default" }}
      >
        {view === "spatial" && planimetriaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={planimetriaUrl}
            alt="Planimetria"
            className="absolute inset-0 w-full h-full object-contain opacity-70 pointer-events-none"
          />
        )}
        {/* Segments */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {graph.segments.map((s) => {
            const from = graph.nodes.find((n) => n.id === s.fromNodeId);
            const to = graph.nodes.find((n) => n.id === s.toNodeId);
            if (!from || !to) return null;
            const fx = (from.planimetriaX ?? 0.5) * 100;
            const fy = (from.planimetriaY ?? 0.5) * 100;
            const tx = (to.planimetriaX ?? 0.5) * 100;
            const ty = (to.planimetriaY ?? 0.5) * 100;
            const dashArray =
              s.kind === "ramo"
                ? "6 4"
                : s.kind === "connessione"
                  ? "2 4"
                  : undefined;
            const strokeWidth = s.kind === "loop" ? 3 : 2;
            return (
              <line
                key={s.id}
                x1={`${fx}%`}
                y1={`${fy}%`}
                x2={`${tx}%`}
                y2={`${ty}%`}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeOpacity={0.7}
                strokeDasharray={dashArray}
              />
            );
          })}
        </svg>
        {/* Nodes */}
        {graph.nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (mode === "add_segment") {
                startSegmentFromNode(n.id);
              } else {
                setSelectedNodeId(n.id === selectedNodeId ? null : n.id);
              }
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
              pendingFromNode === n.id ? "ring-4 ring-blue-300" : ""
            } ${selectedNodeId === n.id ? "ring-4 ring-yellow-300" : ""}`}
            style={{
              left: `${(n.planimetriaX ?? 0.5) * 100}%`,
              top: `${(n.planimetriaY ?? 0.5) * 100}%`,
              backgroundColor: NODE_KIND_COLORS[n.kind],
              borderColor: "white",
            }}
            title={`${NODE_KIND_LABELS[n.kind]}${n.label ? `: ${n.label}` : ""}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(NODE_KIND_LABELS).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border border-white"
              style={{ backgroundColor: NODE_KIND_COLORS[k as NodeKind] }}
            />
            {l}
          </span>
        ))}
        <span className="ml-auto">
          {graph.nodes.length} nodi &middot; {graph.segments.length} segmenti
          {saving && <span className="ml-2 italic">salvataggio...</span>}
        </span>
      </div>

      {/* Selected node panel */}
      {selectedNode && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <h3 className="font-semibold text-sm">Nodo selezionato</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="block text-xs text-muted-foreground mb-1">
                Tipo
              </span>
              <select
                value={selectedNode.kind}
                onChange={(e) =>
                  updateSelectedNode({ kind: e.target.value as NodeKind })
                }
                className="border rounded px-2 py-1 w-full bg-background"
              >
                {Object.entries(NODE_KIND_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-muted-foreground mb-1">
                Etichetta
              </span>
              <input
                type="text"
                value={selectedNode.label ?? ""}
                onChange={(e) => updateSelectedNode({ label: e.target.value })}
                className="border rounded px-2 py-1 w-full bg-background"
                placeholder="es. Ingresso est"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => deleteNode(selectedNode.id)}
            className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200"
          >
            Elimina nodo
          </button>
        </div>
      )}
    </div>
  );
}
