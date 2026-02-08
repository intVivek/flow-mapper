"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCrawler } from "@/store/useCrawler";

function pathOnly(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p === "/" ? "/" : p.replace(/\/$/, "") || url;
  } catch {
    return url;
  }
}

interface FormProps {
  variant?: "standalone" | "sidebar";
}

export function Form({ variant = "standalone" }: FormProps) {
  const {
    url,
    email,
    password,
    maxPages,
    maxTime,
    setUrl,
    setEmail,
    setPassword,
    setMaxPages,
    setMaxTime,
    submit,
    cancel,
    isCrawling,
    currentCrawlPage,
    currentCrawlRoutes,
    pagesCrawledCount,
    crawlResult,
    crawlStartTimeMs,
    crawlDurationMs,
  } = useCrawler();

  const isSidebar = variant === "sidebar";
  const router = useRouter();

  const [tick, setTick] = useState(0);
  const [maxPagesInput, setMaxPagesInput] = useState(() => String(maxPages));
  const [maxTimeInput, setMaxTimeInput] = useState(() => String(maxTime));

  // Keep local input in sync with context when context value changes (e.g. from outside)
  useEffect(() => {
    setMaxPagesInput((prev) => {
      const fromContext = String(maxPages);
      return prev === "" || Number(prev) === maxPages ? fromContext : prev;
    });
  }, [maxPages]);
  useEffect(() => {
    setMaxTimeInput((prev) => {
      const fromContext = String(maxTime);
      return prev === "" || Number(prev) === maxTime ? fromContext : prev;
    });
  }, [maxTime]);
  useEffect(() => {
    if (!isCrawling || !crawlStartTimeMs) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isCrawling, crawlStartTimeMs]);
  const elapsedSec =
    crawlStartTimeMs != null
      ? Math.floor((Date.now() - crawlStartTimeMs) / 1000)
      : 0;
  const estimatedRemainingSec = Math.max(0, maxTime - elapsedSec);

  const formContent = (
    <div className="flex flex-col gap-3">
      {!isSidebar && (
        <div className="space-y-1">
          <h1 className="text-lg font-medium">Flow Mapper</h1>
          <p className="text-muted-foreground text-sm">
            Enter a URL to map navigation flows.
          </p>
        </div>
      )}
      <Input
        type="url"
        placeholder="URL"
        className="h-9"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Input
        type="text"
        placeholder="Email (optional)"
        className="h-9"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password (optional)"
        className="h-9"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Max pages</label>
          <Input
            type="number"
            min={1}
            max={200}
            className="h-9"
            value={maxPagesInput}
            onChange={(e) => {
              const raw = e.target.value;
              setMaxPagesInput(raw);
              const n = Number(raw);
              if (raw !== "" && Number.isFinite(n)) {
                setMaxPages(Math.min(200, Math.max(1, Math.round(n))));
              }
            }}
            onBlur={() => {
              const n = Number(maxPagesInput);
              if (maxPagesInput === "" || !Number.isFinite(n)) {
                setMaxPagesInput(String(maxPages));
              } else {
                const clamped = Math.min(200, Math.max(1, Math.round(n)));
                setMaxPages(clamped);
                setMaxPagesInput(String(clamped));
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Max time (sec)
          </label>
          <Input
            type="number"
            min={10}
            max={3600}
            className="h-9"
            value={maxTimeInput}
            onChange={(e) => {
              const raw = e.target.value;
              setMaxTimeInput(raw);
              const n = Number(raw);
              if (raw !== "" && Number.isFinite(n)) {
                setMaxTime(Math.min(3600, Math.max(10, Math.round(n))));
              }
            }}
            onBlur={() => {
              const n = Number(maxTimeInput);
              if (maxTimeInput === "" || !Number.isFinite(n)) {
                setMaxTimeInput(String(maxTime));
              } else {
                const clamped = Math.min(3600, Math.max(10, Math.round(n)));
                setMaxTime(clamped);
                setMaxTimeInput(String(clamped));
              }
            }}
          />
        </div>
      </div>
      <Button
        className="mt-1 h-9"
        onClick={() => {
          if (isSidebar) {
            submit();
          } else {
            submit();
            router.push("/dashboard");
          }
        }}
        disabled={isCrawling || !url}
      >
        {isCrawling ? "Crawling…" : isSidebar ? "Crawl again" : "Crawl"}
      </Button>
    </div>
  );

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-4">
        {formContent}

        {isCrawling && (
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardContent className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Crawl progress
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="size-3 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin text-muted-foreground"
                  aria-hidden
                />
                <span className="truncate">
                  {currentCrawlPage ? pathOnly(currentCrawlPage) : "Starting…"}
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {pagesCrawledCount}/{maxPages}
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Elapsed Time</dt>
                  <dd className="tabular-nums font-medium">{elapsedSec}s</dd>
                </div>
              </dl>
              {currentCrawlRoutes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Routes on this page ({currentCrawlRoutes.length})
                  </p>
                  <ul className="max-h-48 overflow-y-auto list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                    {currentCrawlRoutes.map((r, i) => (
                      <li key={`${i}-${r}`} className="truncate" title={r}>
                        {pathOnly(r)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  cancel();
                }}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {!isCrawling && crawlResult && (
          <Card className="overflow-hidden border-green-500/30 bg-green-500/10">
            <CardContent className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Crawl complete
              </h3>
              {crawlDurationMs != null && (
                <p className="text-sm font-medium text-muted-foreground">
                  Completed in {(crawlDurationMs / 1000).toFixed(1)}s
                </p>
              )}
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Pages</dt>
                  <dd className="font-medium tabular-nums text-muted-foreground">
                    {crawlResult.pages.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Links</dt>
                  <dd className="font-medium tabular-nums text-muted-foreground">
                    {crawlResult.edges.length}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div className="h-[400px] w-[382px]">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col gap-4">
            {formContent}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
