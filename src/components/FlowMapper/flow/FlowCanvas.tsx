"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FlowNodeData } from "./flowLayout";
import { FlowNode } from "./FlowNode";
import { crawlResultToLayoutedFlow } from "./flowLayout";
import type { CrawlResult } from "@/lib/crawler";
import type { NodeTypes } from "@xyflow/react";

const nodeTypes: NodeTypes = {
  flowNode: FlowNode as NodeTypes["flowNode"],
};

interface FlowCanvasProps {
  crawlResult: CrawlResult | null;
  startUrl?: string;
  isCrawling?: boolean;
}

export function FlowCanvas({
  crawlResult,
  startUrl,
  isCrawling,
}: FlowCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!crawlResult || !crawlResult.pages.length) {
      return { nodes: [], edges: [] };
    }
    return crawlResultToLayoutedFlow(crawlResult, startUrl);
  }, [crawlResult, startUrl]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!crawlResult || !crawlResult.pages.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30">
        {isCrawling ? (
          <>
            <span
              className="size-8 rounded-full border-2 border-current border-t-transparent animate-spin text-muted-foreground"
              aria-hidden
            />
            <p className="text-muted-foreground text-sm">Crawling…</p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            No flow data to display
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-lg border border-border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodeOrigin={[0, 0]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "#475569",
            strokeWidth: 2,
            strokeOpacity: 1,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          nodeColor="hsl(var(--primary) / 0.2)"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
