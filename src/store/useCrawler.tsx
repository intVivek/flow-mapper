"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { CrawlResult } from "@/lib/crawler";

export type FlowGenerateStatus = "pending" | "progress" | "success" | "error";

export interface CrawlerState {
  url: string;
  email: string;
  password: string;
}

interface CrawlerContextValue {
  url: string;
  email: string;
  password: string;
  maxPages: number;
  maxTime: number;
  setUrl: (url: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setMaxPages: (n: number) => void;
  setMaxTime: (n: number) => void;
  submit: () => void;
  cancel: () => void;
  isCrawling: boolean;
  crawlResult: CrawlResult | null;
  liveCrawlResult: CrawlResult | null;
  crawlError: string | null;
  currentCrawlPage: string | null;
  currentCrawlRoutes: string[];
  pagesCrawledCount: number;
  crawlStartTimeMs: number | null;
  crawlDurationMs: number | null;
  flowGenerateStatus: FlowGenerateStatus;
  flowGenerateError: string | null;
}

const CrawlerContext = createContext<CrawlerContextValue | null>(null);

export function CrawlerProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [maxTime, setMaxTime] = useState(120);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [liveCrawlResult, setLiveCrawlResult] = useState<CrawlResult | null>(
    null
  );
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [currentCrawlPage, setCurrentCrawlPage] = useState<string | null>(null);
  const [currentCrawlRoutes, setCurrentCrawlRoutes] = useState<string[]>([]);
  const [pagesCrawledCount, setPagesCrawledCount] = useState(0);
  const [crawlStartTimeMs, setCrawlStartTimeMs] = useState<number | null>(null);
  const [crawlDurationMs, setCrawlDurationMs] = useState<number | null>(null);
  const [flowGenerateStatus, setFlowGenerateStatus] =
    useState<FlowGenerateStatus>("pending");
  const [flowGenerateError, setFlowGenerateError] = useState<string | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLiveCrawlResult(null);
    setCurrentCrawlPage(null);
    setCurrentCrawlRoutes([]);
    setIsCrawling(false);
    setCrawlStartTimeMs(null);
    setFlowGenerateStatus("pending");
    setFlowGenerateError(null);
  }, []);

  function pageTitleFromUrl(pageUrl: string): string {
    try {
      const p = new URL(pageUrl).pathname;
      return p === "/" ? "/" : p.replace(/\/$/, "") || pageUrl;
    } catch {
      return pageUrl;
    }
  }

  const submit = useCallback(async () => {
    if (!url.trim()) return;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setIsCrawling(true);
    setCrawlError(null);
    setCrawlResult(null);
    const startMs = Date.now();
    setCrawlDurationMs(null);
    setCrawlStartTimeMs(startMs);
    setFlowGenerateStatus("pending");
    setFlowGenerateError(null);
    setLiveCrawlResult({ pages: [], edges: [] });
    setCurrentCrawlPage(null);
    setCurrentCrawlRoutes([]);
    setPagesCrawledCount(0);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          email: email.trim() || undefined,
          password: password.trim() || undefined,
          maxPages,
          maxTime,
        }),
        signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        let errMsg = "Crawl failed";
        try {
          const data = text ? JSON.parse(text) : {};
          if (typeof (data as { error?: string }).error === "string")
            errMsg = (data as { error: string }).error;
        } catch {
          /* ignore */
        }
        setCrawlError(errMsg);
        setFlowGenerateStatus("error");
        setFlowGenerateError(errMsg);
        setLiveCrawlResult(null);
        setIsCrawling(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as
              | { type: "progress"; page: string; routes: string[] }
              | { type: "extracting"; message?: string }
              | { type: "result"; data: CrawlResult; flowExtractError?: string }
              | { type: "error"; error: string };
            if (event.type === "extracting") {
              setCurrentCrawlPage(null);
              setCurrentCrawlRoutes([]);
              setFlowGenerateStatus("progress");
            } else if (event.type === "progress") {
              const page = event.page;
              const routes = event.routes ?? [];
              setCurrentCrawlPage(page);
              setCurrentCrawlRoutes(routes);
              setPagesCrawledCount((n) => n + 1);
              setLiveCrawlResult((prev) => ({
                pages: [
                  ...(prev?.pages ?? []),
                  { url: page, title: pageTitleFromUrl(page) },
                ],
                edges: [
                  ...(prev?.edges ?? []),
                  ...routes.map((to) => ({ from: page, to })),
                ],
              }));
            } else if (event.type === "result") {
              setCrawlResult(event.data);
              setCrawlDurationMs(Date.now() - startMs);
              if (event.flowExtractError) {
                setFlowGenerateStatus("error");
                setFlowGenerateError(event.flowExtractError);
              } else {
                setFlowGenerateStatus("success");
                setFlowGenerateError(null);
              }
              console.log("[Crawler] Crawl result:", event.data);
            } else if (event.type === "error") {
              setCrawlError(event.error ?? "Crawl failed");
              setFlowGenerateStatus("error");
              setFlowGenerateError(event.error ?? "Crawl failed");
            }
          } catch {
            /* skip malformed line */
          }
        }
      }
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as
            | { type: "result"; data: CrawlResult; flowExtractError?: string }
            | { type: "error"; error: string };
          if (event.type === "result") {
            setCrawlResult(event.data);
            setCrawlDurationMs(Date.now() - startMs);
            if (event.flowExtractError) {
              setFlowGenerateStatus("error");
              setFlowGenerateError(event.flowExtractError);
            } else {
              setFlowGenerateStatus("success");
              setFlowGenerateError(null);
            }
            setLiveCrawlResult(null);
            setPagesCrawledCount(event.data.pages.length);
          } else if (event.type === "error") {
            setCrawlError(event.error ?? "Crawl failed");
            setFlowGenerateStatus("error");
            setFlowGenerateError(event.error ?? "Crawl failed");
          }
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (!isAbort) {
        const msg = err instanceof Error ? err.message : "Crawl failed";
        setCrawlError(msg);
        setFlowGenerateStatus("error");
        setFlowGenerateError(msg);
        console.error("[Crawler] Crawl error:", err);
      }
      if (isAbort) setCrawlDurationMs(Date.now() - startMs);
    } finally {
      abortControllerRef.current = null;
      setIsCrawling(false);
      setCurrentCrawlPage(null);
      setCurrentCrawlRoutes([]);
      setLiveCrawlResult(null);
      setCrawlStartTimeMs(null);
    }
  }, [url, email, password, maxPages, maxTime]);

  return (
    <CrawlerContext.Provider
      value={{
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
        crawlResult,
        liveCrawlResult,
        crawlError,
        currentCrawlPage,
        currentCrawlRoutes,
        pagesCrawledCount,
        crawlStartTimeMs,
        crawlDurationMs,
        flowGenerateStatus,
        flowGenerateError,
      }}
    >
      {children}
    </CrawlerContext.Provider>
  );
}

export function useCrawler() {
  const ctx = useContext(CrawlerContext);
  if (!ctx) {
    throw new Error("useCrawler must be used within CrawlerProvider");
  }
  return ctx;
}
