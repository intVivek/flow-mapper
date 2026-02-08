"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CrawlResult } from "@/lib/crawler";
import SAMPLE_DATA_JSON from "./SAMPLE_DATA_JSON.json";

export interface CrawlerState {
  url: string;
  email: string;
  password: string;
}

interface CrawlerContextValue {
  url: string;
  email: string;
  password: string;
  setUrl: (url: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  submit: () => void;
  isCrawling: boolean;
  crawlResult: CrawlResult | null;
  crawlError: string | null;
}

const CrawlerContext = createContext<CrawlerContextValue | null>(null);

export function CrawlerProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!url.trim()) return;
    setIsCrawling(true);
    setCrawlError(null);
    setCrawlResult(null);
    try {
      // setCrawlResult(
      //   JSON.parse(JSON.stringify(SAMPLE_DATA_JSON)) as CrawlResult
      // );
      // return;
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        }),
      });
      const text = await res.text();
      let data: CrawlResult | { error?: string };
      try {
        data = text
          ? (JSON.parse(text) as CrawlResult | { error?: string })
          : {};
      } catch {
        setCrawlError(
          res.ok
            ? "Invalid response from server"
            : `Server error (${res.status}). Check the API route and server logs.`
        );
        return;
      }
      if (!res.ok) {
        setCrawlError((data as { error?: string }).error ?? "Crawl failed");
        return;
      }
      setCrawlResult(data as CrawlResult);
      console.log("[Crawler] Crawl result:", data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Crawl failed";
      setCrawlError(message);
      console.error("[Crawler] Crawl error:", err);
    } finally {
      setIsCrawling(false);
    }
  }, [url, email, password]);

  return (
    <CrawlerContext.Provider
      value={{
        url,
        email,
        password,
        setUrl,
        setEmail,
        setPassword,
        submit,
        isCrawling,
        crawlResult,
        crawlError,
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
