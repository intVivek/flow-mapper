"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { FlowNodeData } from "./flowLayout";

function FlowNodeComponent(props: NodeProps<Node<FlowNodeData, "flowNode">>) {
  const data = props.data as FlowNodeData;
  let displayTitle = data.title;
  if (!displayTitle) {
    try {
      displayTitle = new URL(data.url).pathname || data.url;
    } catch {
      displayTitle = data.url;
    }
  }

  return (
    <div className="relative flex h-12 w-[220px] items-center rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-primary !bg-background"
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-card-foreground"
          title={displayTitle}
        >
          {displayTitle}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={data.url}>
          {data.url}
        </p>
      </div>
      <Handle
        id="source"
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-primary !bg-background"
      />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
