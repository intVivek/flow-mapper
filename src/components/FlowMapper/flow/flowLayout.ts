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
 * found links to but didn't visit). This creates real hierarchy/depth.
 */
function expandPagesWithEdgeTargets(
  pages: { url: string; title: string }[],
  allEdges: { from: string; to: string }[]
): { url: string; title: string }[] {
  const pageMap = new Map(pages.map((p) => [p.url, p]));
  const originalIds = new Set(pages.map((p) => p.url));
  for (const e of allEdges) {
    if (pageMap.size >= MAX_NODES) break;
    if (!pageMap.has(e.to) && e.from !== e.to && originalIds.has(e.from)) {
      const path = (() => {
        try {
          return new URL(e.to).pathname || e.to;
        } catch {
          return e.to;
        }
      })();
      pageMap.set(e.to, { url: e.to, title: path.slice(1) || "Home" });
    }
  }
  return Array.from(pageMap.values());
}

/**
 * BFS tree from root. Includes subpages (edge targets) for real hierarchy.
 */
function buildTreeEdges(
  pages: { url: string; title: string }[],
  allEdges: { from: string; to: string }[],
  startUrl?: string
): Edge[] {
  const expandedPages = expandPagesWithEdgeTargets(pages, allEdges);
  const pageIds = new Set(expandedPages.map((p) => p.url));

  const root = (() => {
    if (startUrl?.trim()) {
      const normStart = normalizeUrl(startUrl.trim());
      const match = expandedPages.find((p) => normalizeUrl(p.url) === normStart);
      if (match) return match.url;
    }
    return expandedPages[0]?.url ?? pages[0]?.url;
  })();
  if (!root) return [];

  const validEdges = allEdges.filter(
    (e) => pageIds.has(e.from) && pageIds.has(e.to) && e.from !== e.to
  );

  const treeEdges: Edge[] = [];
  const visited = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const from = queue.shift()!;
    for (const e of validEdges) {
      if (e.from === from && !visited.has(e.to)) {
        visited.add(e.to);
        treeEdges.push({
          id: `${e.from}->${e.to}`,
          source: e.from,
          target: e.to,
          sourceHandle: "source",
          targetHandle: "target",
        });
        queue.push(e.to);
      }
    }
  }

  return treeEdges;
}

function crawlResultToFlowNodes(
  result: CrawlResult,
  startUrl?: string
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const expandedPages = expandPagesWithEdgeTargets(result.pages, result.edges);
  const nodes: Node<FlowNodeData>[] = expandedPages.map((page) => ({
    id: page.url,
    type: "flowNode",
    position: { x: 0, y: 0 },
    data: { url: page.url, title: page.title },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges = buildTreeEdges(expandedPages, result.edges, startUrl);

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
  startUrl?: string
): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const { nodes, edges } = crawlResultToFlowNodes(result, startUrl);
  return getLayoutedElements(nodes, edges);
}
