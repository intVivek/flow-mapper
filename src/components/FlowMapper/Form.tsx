"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFlowMapper } from "./FlowMapperContext";

export function Form() {
  const {
    url,
    email,
    password,
    setUrl,
    setEmail,
    setPassword,
    submit,
    isCrawling,
  } = useFlowMapper();

  return (
    <div className="flex min-h-full w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-medium">Flow Mapper</h1>
            <p className="text-muted-foreground text-sm">
              Enter a URL to map navigation flows. Auth is optional for
              protected apps.
            </p>
          </div>
          <div className="flex flex-col gap-3">
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
            <Button className="mt-1 h-9" onClick={submit} disabled={isCrawling}>
              {isCrawling ? "Crawling…" : "Map"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
