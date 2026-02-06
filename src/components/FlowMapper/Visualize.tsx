"use client";

import { Form } from "./Form";
import FlowDiagram from "./FlowDiagram";

export default function Visualize() {
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-72 shrink-0 flex-col gap-4 border-r bg-muted/30 p-4">
        <Form variant="sidebar" />
      </aside>
      <main className="min-w-0 flex-1 p-4">
        <FlowDiagram />
      </main>
    </div>
  );
}
