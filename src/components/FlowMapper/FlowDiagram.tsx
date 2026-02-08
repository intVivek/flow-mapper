"use client";

import { useCrawler } from "@/store";
import { FlowCanvas } from "./flow";

export default function FlowDiagram() {
  const { crawlResult, liveCrawlResult, url, isCrawling } = useCrawler();
  const displayResult = crawlResult ?? liveCrawlResult;

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <h2 className="text-lg font-medium">
        Flow Diagram {isCrawling && "(live)"}
      </h2>
      <div className="min-h-0 flex-1">
        <FlowCanvas
          crawlResult={displayResult}
          startUrl={url || undefined}
          isCrawling={isCrawling}
        />
      </div>
    </div>
  );
}
