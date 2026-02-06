import { NextResponse } from "next/server";
import { crawl } from "@/lib/crawler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, email, password } = body as {
      url?: string;
      email?: string;
      password?: string;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const result = await crawl(url, {
      email: email || undefined,
      password: password || undefined,
      maxPages: 20,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Crawl error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Crawl failed" },
      { status: 500 }
    );
  }
}
