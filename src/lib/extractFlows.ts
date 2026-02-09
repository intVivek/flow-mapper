import Groq from "groq-sdk";
import type { CrawlResult } from "./crawler";

export interface UserFlow {
  id: string;
  title: string;
  description?: string;
  pageUrls: string[];
}

export interface FlowExtractionResult {
  flows: UserFlow[];
  globalNavUrls: string[];
  denoisedEdges: { from: string; to: string }[];
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return u;
  }
}

/**
 * Heuristic: Links that appear as targets from a high percentage of pages
 * are likely global navigation (header/footer links).
 */
export function computeGlobalNavCandidates(result: CrawlResult): string[] {
  const inboundCount = new Map<string, number>();
  const pageCount = result.pages.length;
  if (pageCount === 0) return [];

  for (const e of result.edges) {
    const to = normalizeUrl(e.to);
    inboundCount.set(to, (inboundCount.get(to) ?? 0) + 1);
  }

  const threshold = Math.max(2, Math.ceil(pageCount * 0.5));
  const globalNav: string[] = [];
  for (const [url, count] of inboundCount) {
    if (count >= threshold) globalNav.push(url);
  }
  return globalNav;
}

/**
 * Remove redundant edges caused by global nav (links on every page).
 * For each global nav target, keeps only one edge - preferably from start URL.
 */
function denoiseEdges(
  result: CrawlResult,
  globalNavUrls: string[],
  startUrl?: string
): { from: string; to: string }[] {
  const globalSet = new Set(globalNavUrls.map(normalizeUrl));
  if (globalSet.size === 0) return result.edges;

  const rootNorm = startUrl?.trim() ? normalizeUrl(startUrl) : result.pages[0] ? normalizeUrl(result.pages[0].url) : null;
  const keptGlobalTargets = new Map<string, { from: string; to: string }>();
  const nonGlobalEdges: { from: string; to: string }[] = [];

  for (const e of result.edges) {
    const fromNorm = normalizeUrl(e.from);
    const toNorm = normalizeUrl(e.to);
    if (fromNorm === toNorm) continue;

    if (globalSet.has(toNorm)) {
      const existing = keptGlobalTargets.get(toNorm);
      const preferFromRoot = rootNorm && fromNorm === rootNorm;
      if (!existing || (preferFromRoot && existing.from !== rootNorm)) {
        keptGlobalTargets.set(toNorm, { from: e.from, to: e.to });
      }
      continue;
    }
    nonGlobalEdges.push({ from: e.from, to: e.to });
  }

  return [...nonGlobalEdges, ...keptGlobalTargets.values()];
}

const SYSTEM_PROMPT = `You are an expert at analyzing website navigation and user flows. Given a crawl result (pages and links), your job is to:
1. Identify meaningful user flows (navigation paths), not raw link graphs.
2. Classify links that appear on most pages as global navigation (e.g. Home, Login, Footer links).
3. Extract distinct user flows with clear, descriptive titles.

Output valid JSON only, no markdown.`;

const MAX_PAGES_FOR_LLM = 15;
const MAX_EDGES_FOR_LLM = 40;

function getBaseUrl(result: CrawlResult, startUrl?: string): string {
  if (startUrl?.trim()) {
    try {
      const u = new URL(startUrl);
      return u.origin;
    } catch {
      /* fallthrough */
    }
  }
  if (result.pages[0]?.url) {
    try {
      return new URL(result.pages[0].url).origin;
    } catch {
      /* fallthrough */
    }
  }
  return "";
}

function toPath(url: string, baseUrl: string): string {
  if (!baseUrl) return url;
  try {
    const u = new URL(url, baseUrl);
    const p = u.pathname || "/";
    return p === "/" ? "/" : p.replace(/\/$/, "") || "/";
  } catch {
    return url;
  }
}

function toFullUrl(path: string, baseUrl: string): string {
  if (!baseUrl || path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  try {
    return new URL(p, baseUrl).href;
  } catch {
    return path;
  }
}

function buildUserPrompt(
  result: CrawlResult,
  globalNavCandidates: string[],
  baseUrl: string
): string {
  const pagesSummary = result.pages.slice(0, MAX_PAGES_FOR_LLM).map((p) => ({
    path: toPath(p.url, baseUrl),
    title: p.title,
  }));

  const edgesSummary = result.edges.slice(0, MAX_EDGES_FOR_LLM).map((e) => ({
    from: toPath(e.from, baseUrl),
    to: toPath(e.to, baseUrl),
  }));

  const globalNavPaths = globalNavCandidates.map((u) => toPath(u, baseUrl));

  return `Analyze this website crawl and extract meaningful user flows.
Base URL: ${baseUrl || "(same-origin)"} — all paths below are relative to this.

PAGES (${pagesSummary.length}):
${JSON.stringify(pagesSummary, null, 0)}

LINK GRAPH (edges):
${JSON.stringify(edgesSummary, null, 0)}

HEURISTIC: These paths are linked from many pages (likely global nav - header/footer):
${JSON.stringify(globalNavPaths)}

Tasks:
1. Identify global navigation paths (links on most pages - Home, Login, Terms, etc.). Use the heuristic list and your judgment.
2. Extract 3-8 meaningful user flows. Each flow is a sequence of paths representing a distinct user journey.
3. Give each flow a short, descriptive title (2-5 words).

Respond with this exact JSON structure only. Use paths (e.g. "/pricing", "/") not full URLs:
{
  "globalNavUrls": ["/path1", "/path2"],
  "flows": [
    {
      "id": "flow-1",
      "title": "Flow Title",
      "description": "Brief description",
      "pageUrls": ["/path1", "/path2", "/path3"]
    }
  ]
}`;
}

export async function extractFlowsWithLLM(
  result: CrawlResult,
  options?: {
    apiKey?: string;
    startUrl?: string;
  }
): Promise<FlowExtractionResult | null> {
  const apiKey = options?.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[extractFlows] GROQ_API_KEY not set, skipping LLM flow extraction");
    return null;
  }

  if (result.pages.length === 0 || result.edges.length === 0) {
    return { flows: [], globalNavUrls: [], denoisedEdges: result.edges };
  }

  const baseUrl = getBaseUrl(result, options?.startUrl);
  const globalNavCandidates = computeGlobalNavCandidates(result);
  const userContent = buildUserPrompt(result, globalNavCandidates, baseUrl);
  console.log("[extractFlows] Sending to LLM:", {
    system: SYSTEM_PROMPT,
    user: userContent,
  });
  const client = new Groq({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      globalNavUrls?: string[];
      flows?: Array<{
        id?: string;
        title?: string;
        description?: string;
        pageUrls?: string[];
      }>;
    };

    const globalNavUrlsRaw = Array.isArray(parsed.globalNavUrls) ? parsed.globalNavUrls : globalNavCandidates;
    const globalNavUrls = baseUrl
      ? globalNavUrlsRaw.map((u) => toFullUrl(u, baseUrl))
      : globalNavUrlsRaw;
    const flows: UserFlow[] = (parsed.flows ?? []).map((f, i) => ({
      id: f.id ?? `flow-${i + 1}`,
      title: f.title ?? `Flow ${i + 1}`,
      description: f.description,
      pageUrls: Array.isArray(f.pageUrls)
        ? (baseUrl ? f.pageUrls.map((u) => toFullUrl(u, baseUrl)) : f.pageUrls)
        : [],
    }));

    const denoisedEdges = denoiseEdges(result, globalNavUrls, options?.startUrl);

    return { flows, globalNavUrls, denoisedEdges };
  } catch (err) {
    console.error("[extractFlows] LLM error:", err);
    return null;
  }
}
