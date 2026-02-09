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

  const titleOnly = data.titleOnly === true;

  return (
    <div
      className={
        titleOnly
          ? "relative flex h-12 w-[220px] items-center rounded-lg border-2 border-primary bg-primary/15 px-3 py-2 shadow-sm"
          : "relative flex h-12 w-[220px] items-center rounded-lg border border-border bg-card px-3 py-2 shadow-sm"
      }
    >
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        className="!pointer-events-none !invisible !h-0 !w-0 !border-0"
      />
      <div className="min-w-0 flex-1">
        <p
          className={
            titleOnly
              ? "truncate text-sm font-medium text-primary"
              : "truncate text-sm font-medium text-card-foreground"
          }
          title={displayTitle}
        >
          {displayTitle}
        </p>
        {!titleOnly && (
          <p
            className="truncate text-xs text-muted-foreground"
            title={data.url}
          >
            {data.url}
          </p>
        )}
      </div>
      <Handle
        id="source"
        type="source"
        position={Position.Right}
        className="!pointer-events-none !invisible !h-0 !w-0 !border-0"
      />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
