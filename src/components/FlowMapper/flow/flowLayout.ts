import dagre from "dagre";
import { Position, type Node, type Edge } from "@xyflow/react";
import type { CrawlResult } from "@/lib/crawler";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 48;
const LAYOUT_DIRECTION = "LR";
const MAX_NODES = 80;

export interface FlowNodeData extends Record<string, unknown> {
  url: string;
  title: string;
  /** When true, node shows only the title (no URL). Used for flow-title chain. */
  titleOnly?: boolean;
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return u;
  }
}

/**
 * Expand pages to include edge targets not yet in pages (subpages the crawler
 * found links to but didn't visit). Uses normalized URLs as keys so that
 * redirects (e.g. trailing slash vs no slash) don't create duplicate nodes.
 */
function expandPagesWithEdgeTargets(
  pages: { url: string; title: string }[],
  allEdges: { from: string; to: string }[]
): { id: string; url: string; title: string }[] {
  const pageMap = new Map<string, { url: string; title: string }>();
  const originalNormIds = new Set(pages.map((p) => normalizeUrl(p.url)));
  for (const p of pages) {
    const nid = normalizeUrl(p.url);
    if (!pageMap.has(nid)) pageMap.set(nid, { url: p.url, title: p.title });
  }
  for (const e of allEdges) {
    if (pageMap.size >= MAX_NODES) break;
    const normFrom = normalizeUrl(e.from);
    const normTo = normalizeUrl(e.to);
    if (normFrom === normTo) continue;
    if (!pageMap.has(normTo) && originalNormIds.has(normFrom)) {
      const path = (() => {
        try {
          return new URL(e.to).pathname || e.to;
        } catch {
          return e.to;
        }
      })();
      pageMap.set(normTo, { url: e.to, title: path.slice(1) || "Home" });
    }
  }
  return Array.from(pageMap.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * BFS tree from root. Returns edges and the set of reachable node ids so we
 * only render nodes that are connected (no dangling nodes).
 */
function buildTreeEdges(
  expandedPages: { id: string; url: string; title: string }[],
  allEdges: { from: string; to: string }[],
  startUrl?: string
): { edges: Edge[]; reachableIds: Set<string> } {
  const pageIds = new Set(expandedPages.map((p) => p.id));

  const root = (() => {
    if (startUrl?.trim()) {
      const normStart = normalizeUrl(startUrl.trim());
      const match = expandedPages.find((p) => p.id === normStart);
      if (match) return match.id;
    }
    return expandedPages[0]?.id ?? null;
  })();
  if (!root) return { edges: [], reachableIds: new Set() };

  const validEdges = allEdges.filter((e) => {
    const normFrom = normalizeUrl(e.from);
    const normTo = normalizeUrl(e.to);
    return normFrom !== normTo && pageIds.has(normFrom) && pageIds.has(normTo);
  });

  const treeEdges: Edge[] = [];
  const reachableIds = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const from = queue.shift()!;
    for (const e of validEdges) {
      const normFrom = normalizeUrl(e.from);
      const normTo = normalizeUrl(e.to);
      if (normFrom === from && !reachableIds.has(normTo)) {
        reachableIds.add(normTo);
        treeEdges.push({
          id: `${normFrom}->${normTo}`,
          source: normFrom,
          target: normTo,
          sourceHandle: "source",
          targetHandle: "target",
        });
        queue.push(normTo);
      }
    }
  }

  return { edges: treeEdges, reachableIds };
}

/**
 * Build a single chain where each node is one flow (by title). Order: flows[0] -> flows[1] -> ...
 * Used when crawl is completed to show user flows as one chain with only titles.
 */
function flowsToTitleChainNodes(
  flows: { id: string; title: string; pageUrls: string[] }[]
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  if (flows.length === 0) return { nodes: [], edges: [] };

  const nodes: Node<FlowNodeData>[] = flows.map((flow) => ({
    id: flow.id,
    type: "flowNode",
    position: { x: 0, y: 0 },
    data: { url: "", title: flow.title, titleOnly: true },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < flows.length - 1; i++) {
    edges.push({
      id: `flow-${flows[i].id}->${flows[i + 1].id}`,
      source: flows[i].id,
      target: flows[i + 1].id,
      sourceHandle: "source",
      targetHandle: "target",
    });
  }

  return { nodes, edges };
}

/**
 * Build graph from LLM-extracted flows only. Each flow defines a sequential
 * path: pageUrls[0] -> pageUrls[1] -> ... Edges are only between consecutive pages.
 */
function flowsToFlowNodes(
  result: CrawlResult,
  flows: { id: string; title: string; pageUrls: string[] }[]
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const pageMap = new Map<string, { url: string; title: string }>();
  for (const p of result.pages) {
    const nid = normalizeUrl(p.url);
    pageMap.set(nid, { url: p.url, title: p.title });
  }

  const allEdges: Edge[] = [];
  const nodeIds = new Set<string>();

  for (const flow of flows) {
    const urls = flow.pageUrls.map((u) => normalizeUrl(u)).filter((u) => u);
    for (let i = 0; i < urls.length; i++) {
      nodeIds.add(urls[i]);
      if (i > 0 && urls[i - 1] !== urls[i]) {
        allEdges.push({
          id: `${urls[i - 1]}->${urls[i]}-${flow.id}`,
          source: urls[i - 1],
          target: urls[i],
          sourceHandle: "source",
          targetHandle: "target",
        });
      }
    }
  }

  const nodes: Node<FlowNodeData>[] = Array.from(nodeIds).map((id) => {
    const p = pageMap.get(id);
    const title = p?.title ?? (() => {
      try {
        const path = new URL(id).pathname;
        return path === "/" ? "/" : path.replace(/\/$/, "") || id;
      } catch {
        return id;
      }
    })();
    return {
      id,
      type: "flowNode",
      position: { x: 0, y: 0 },
      data: { url: p?.url ?? id, title },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return { nodes, edges: allEdges };
}

function crawlResultToFlowNodes(
  result: CrawlResult,
  startUrl?: string,
  options?: { flowTitlesChain?: boolean }
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  if (result.flows && result.flows.length > 0) {
    if (options?.flowTitlesChain) {
      return flowsToTitleChainNodes(result.flows);
    }
    return flowsToFlowNodes(result, result.flows);
  }

  const edgesToUse = result.denoisedEdges && result.denoisedEdges.length > 0
    ? result.denoisedEdges
    : result.edges;
  const expandedPages = expandPagesWithEdgeTargets(result.pages, edgesToUse);
  const { edges, reachableIds } = buildTreeEdges(
    expandedPages,
    edgesToUse,
    startUrl
  );
  const nodes: Node<FlowNodeData>[] = expandedPages
    .filter((page) => reachableIds.has(page.id))
    .map((page) => ({
      id: page.id,
      type: "flowNode",
      position: { x: 0, y: 0 },
      data: { url: page.url, title: page.title },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

  return { nodes, edges };
}

function getLayoutedElements(nodes: Node<FlowNodeData>[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: LAYOUT_DIRECTION, nodesep: 40, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id) as { x: number; y: number };
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function crawlResultToLayoutedFlow(
  result: CrawlResult,
  startUrl?: string,
  options?: { flowTitlesChain?: boolean }
): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const { nodes, edges } = crawlResultToFlowNodes(result, startUrl, options);
  return getLayoutedElements(nodes, edges);
}
