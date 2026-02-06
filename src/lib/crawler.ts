import { chromium } from "playwright";

export interface CrawlPage {
  url: string;
  title: string;
}

export interface CrawlEdge {
  from: string;
  to: string;
}

export interface CrawlResult {
  pages: CrawlPage[];
  edges: CrawlEdge[];
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isSameSite(url: string, baseUrl: string): boolean {
  const baseHost = getHostname(baseUrl);
  const urlHost = getHostname(url);
  if (baseHost === urlHost) return true;
  if (urlHost === `www.${baseHost}` || baseHost === `www.${urlHost}`) return true;
  return false;
}

function normalizeUrl(url: string, base?: string): string {
  try {
    const u = new URL(url, base);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return url;
  }
}

function isMeaningfulLink(href: string, baseUrl: string): boolean {
  if (!href || href === "#" || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return false;
    if (!isSameSite(resolved.href, baseUrl)) return false;
    const path = resolved.pathname;
    if (path.match(/\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?|woff|ttf|eot)(\?|$)/i)) return false;
    return true;
  } catch {
    return false;
  }
}

async function performLogin(
  page: import("playwright").Page,
  email: string,
  password: string,
  startUrl: string
): Promise<boolean> {
  try {
    await page.goto(startUrl, { waitUntil: "load", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));

    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[autocomplete="username"]',
      'input[placeholder*="mail" i]',
      'input[placeholder*="user" i]',
    ];
    const passSelector = 'input[type="password"]';
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      '[type="submit"]',
    ];

    let emailEl = null;
    for (const sel of emailSelectors) {
      emailEl = await page.$(sel);
      if (emailEl) break;
    }
    const passEl = await page.$(passSelector);
    if (!emailEl || !passEl) return false;

    await emailEl.fill(email);
    await passEl.fill(password);

    let submitted = false;
    for (const sel of submitSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        submitted = true;
        break;
      }
    }
    if (!submitted) return false;

    await page.waitForLoadState("networkidle").catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  } catch {
    return false;
  }
}

export async function crawl(
  startUrl: string,
  options?: {
    email?: string;
    password?: string;
    maxPages?: number;
  }
): Promise<CrawlResult> {
  const { maxPages = 20, email, password } = options ?? {};
  const pages: CrawlPage[] = [];
  const edgesMap = new Map<string, Set<string>>();
  const seenUrls = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl, startUrl)];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const addEdge = (from: string, to: string) => {
    if (!edgesMap.has(from)) edgesMap.set(from, new Set());
    edgesMap.get(from)!.add(to);
  };

  try {
    if (email && password) {
      const loginPage = await context.newPage();
      await performLogin(loginPage, email, password, startUrl);
      await loginPage.close();
    }

    while (queue.length > 0 && pages.length < maxPages) {
      const url = queue.shift()!;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: "load", timeout: 20000 });
      } catch {
        await page.close();
        continue;
      }

      await new Promise((r) => setTimeout(r, 1500));

      await page.evaluate(async () => {
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < 5; i++) {
          window.scrollTo(0, document.body.scrollHeight * ((i + 1) / 5));
          await delay(400);
        }
        window.scrollTo(0, 0);
        await delay(500);
      }).catch(() => {});

      await new Promise((r) => setTimeout(r, 1000));

      const actualUrl = normalizeUrl(page.url(), url);
      if (actualUrl !== url) {
        seenUrls.add(actualUrl);
      }
      const pageUrl = actualUrl;
      const title = await page.title().catch(() => pageUrl);
      pages.push({ url: pageUrl, title });

      const links = await page.$$eval(
        "a[href], [data-href], [routerlink]",
        (els) => {
          const base = window.location.href;
          const hrefs: string[] = [];
          els.forEach((el) => {
            let href = (el as HTMLAnchorElement).href;
            if (!href) {
              const attr = (el as HTMLElement).getAttribute("href") ?? (el as HTMLElement).getAttribute("data-href") ?? (el as HTMLElement).getAttribute("routerlink");
              if (attr) href = new URL(attr, base).href;
            }
            if (href && href !== "#" && !href.startsWith("javascript:")) hrefs.push(href);
          });
          return [...new Set(hrefs)];
        }
      ).catch(() =>
        page.$$eval(
          "a[href]",
          (anchors) =>
            anchors
              .map((a) => (a as HTMLAnchorElement).href)
              .filter((h) => h && h !== "#" && !h.startsWith("javascript:"))
        )
      );

      for (const href of links) {
        const targetUrl = normalizeUrl(href, pageUrl);
        if (!isMeaningfulLink(href, pageUrl)) continue;
        addEdge(pageUrl, targetUrl);
        if (!seenUrls.has(targetUrl)) {
          queue.push(targetUrl);
        }
      }

      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const edges: CrawlEdge[] = [];
  for (const [from, toSet] of edgesMap) {
    for (const to of toSet) edges.push({ from, to });
  }
  return { pages, edges };
}
