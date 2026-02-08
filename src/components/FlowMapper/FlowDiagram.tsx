"use client";

import { useCrawler } from "@/store";
import { FlowCanvas } from "./flow";

export default function FlowDiagram() {
  const { crawlResult, url } = useCrawler();

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <h2 className="text-lg font-medium">Flow diagram</h2>
      <div className="min-h-0 flex-1">
        <FlowCanvas crawlResult={crawlResult} startUrl={url || undefined} />
      </div>
    </div>
  );
}
