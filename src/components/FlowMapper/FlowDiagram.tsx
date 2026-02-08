"use client";

import { useCrawler } from "@/store";
import { FlowCanvas } from "./flow";

export default function FlowDiagram() {
  const { crawlResult, liveCrawlResult, url, isCrawling } = useCrawler();
  const displayResult = crawlResult ?? liveCrawlResult;

  return (
    <div className="flex h-full w-full flex-col gap-3">
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
