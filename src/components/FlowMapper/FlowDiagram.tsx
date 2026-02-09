"use client";

import { useCrawler } from "@/store";
import { FlowCanvas } from "./flow";

export default function FlowDiagram() {
  const { crawlResult, liveCrawlResult, url, isCrawling } = useCrawler();
  const displayResult = crawlResult ?? liveCrawlResult;
  const flows = displayResult?.flows ?? [];

  return (
    <div className="flex h-full w-full flex-col gap-3">
      {flows.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="text-muted-foreground text-xs font-medium">
            User flows:
          </span>
          {flows.map((f) => (
            <span
              key={f.id}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary"
              title={f.description ?? f.pageUrls.join(" → ")}
            >
              {f.title}
            </span>
          ))}
        </div>
      )}
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
