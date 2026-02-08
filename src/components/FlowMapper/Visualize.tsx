"use client";

import { Form } from "./Form";
import FlowDiagram from "./FlowDiagram";
import { useCrawler } from "@/store/useCrawler";

export default function Visualize() {
  const { isCrawling } = useCrawler();
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-96 shrink-0 flex-col gap-4 border-r border-border bg-muted/30 p-5">
        <h2 className="text-lg font-medium">
          Flow Diagram {isCrawling && "(live)"}
        </h2>
        <Form variant="sidebar" />
      </aside>
      <main className="min-w-0 flex-1 bg-background p-4">
        <FlowDiagram />
      </main>
    </div>
  );
}
