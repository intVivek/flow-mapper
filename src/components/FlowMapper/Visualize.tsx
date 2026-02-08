"use client";

import { Form } from "./Form";
import FlowDiagram from "./FlowDiagram";

export default function Visualize() {
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-96 shrink-0 flex-col gap-4 border-r border-border bg-muted/30 p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            Flow Mapper
          </h2>
          <p className="text-xs text-muted-foreground">
            Crawl a URL and view the flow diagram
          </p>
        </div>
        <Form variant="sidebar" />
      </aside>
      <main className="min-w-0 flex-1 p-4">
        <FlowDiagram />
      </main>
    </div>
  );
}
