"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CrawlResult } from "@/lib/crawler";

export interface FlowMapperState {
  url: string;
  email: string;
  password: string;
}

interface FlowMapperContextValue {
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

const FlowMapperContext = createContext<FlowMapperContextValue | null>(null);

export function FlowMapperProvider({ children }: { children: ReactNode }) {
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
      console.log("[FlowMapper] Crawl result:", data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Crawl failed";
      setCrawlError(message);
      console.error("[FlowMapper] Crawl error:", err);
    } finally {
      setIsCrawling(false);
    }
  }, [url, email, password]);

  return (
    <FlowMapperContext.Provider
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
    </FlowMapperContext.Provider>
  );
}

export function useFlowMapper() {
  const ctx = useContext(FlowMapperContext);
  if (!ctx) {
    throw new Error("useFlowMapper must be used within FlowMapperProvider");
  }
  return ctx;
}
