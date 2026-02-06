"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCrawler } from "@/store/useCrawler";

interface FormProps {
  variant?: "standalone" | "sidebar";
}

export function Form({ variant = "standalone" }: FormProps) {
  const {
    url,
    email,
    password,
    setUrl,
    setEmail,
    setPassword,
    submit,
    isCrawling,
  } = useCrawler();

  const isSidebar = variant === "sidebar";

  const formContent = (
    <div className="flex flex-col gap-3">
      {!isSidebar && (
        <div className="space-y-1">
          <h1 className="text-lg font-medium">Flow Mapper</h1>
          <p className="text-muted-foreground text-sm">
            Enter a URL to map navigation flows. Auth is optional for protected
            apps.
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
      <Button
        className="mt-1 h-9"
        onClick={submit}
        disabled={isCrawling || !url}
      >
        {isCrawling ? "Crawling…" : isSidebar ? "Crawl again" : "Crawl"}
      </Button>
    </div>
  );

  if (isSidebar) {
    return <div className="flex flex-col gap-3">{formContent}</div>;
  }

  return (
    <div className="flex min-h-full w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">{formContent}</CardContent>
      </Card>
    </div>
  );
}
