import { crawl } from "@/lib/crawler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { url, email, password, maxPages: bodyMaxPages, maxTime: bodyMaxTime } =
    body as {
      url?: string;
      email?: string;
      password?: string;
      maxPages?: number;
      maxTime?: number;
    };

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  const maxPages = Math.min(
    200,
    Math.max(1, typeof bodyMaxPages === "number" ? bodyMaxPages : 20)
  );
  const maxTimeSec =
    typeof bodyMaxTime === "number" ? Math.max(10, Math.min(3600, bodyMaxTime)) : undefined;
  const maxTimeMs = maxTimeSec != null ? maxTimeSec * 1000 : undefined;

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const send = (obj: object) =>
    writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  (async () => {
    try {
      const result = await crawl(url, {
        email: email?.trim() || undefined,
        password: password?.trim() || undefined,
        maxPages,
        maxTimeMs,
        onProgress(page, routes) {
          send({ type: "progress", page, routes });
        },
      });
      send({ type: "result", data: result });
    } catch (err) {
      console.error("Crawl error:", err);
      send({
        type: "error",
        error: err instanceof Error ? err.message : "Crawl failed",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
