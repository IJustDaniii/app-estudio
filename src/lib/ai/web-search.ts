import { isIP } from "node:net";

export const MAX_WEB_QUERY_LENGTH = 200;
export const MAX_WEB_RESULTS = 5;
export const MAX_WEB_RESPONSE_BYTES = 1_000_000;
export const DEFAULT_WEB_TIMEOUT_MS = 5_000;
const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type WebSearchResult = { title: string; url: string; snippet: string; source: string };
export type WebSearchResponse = { source: "internet"; query: string; results: WebSearchResult[]; omitted: string[] };
export type WebSearchErrorCode = "CONSENT_REQUIRED" | "INVALID_QUERY" | "TIMEOUT" | "UNAVAILABLE" | "RESPONSE_TOO_LARGE";

const messages: Record<WebSearchErrorCode, string> = {
  CONSENT_REQUIRED: "La busqueda web necesita tu consentimiento explicito en este mensaje.",
  INVALID_QUERY: "La busqueda web necesita una consulta breve y valida.",
  TIMEOUT: "La busqueda web tardo demasiado. Puedes intentarlo de nuevo.",
  UNAVAILABLE: "La busqueda web no esta disponible ahora. Puedo responder con los datos de tu aplicacion.",
  RESPONSE_TOO_LARGE: "La fuente web devolvio demasiado contenido y no se analizo.",
};

export class WebSearchError extends Error {
  constructor(public readonly code: WebSearchErrorCode, options?: { cause?: unknown }) {
    super(messages[code], options);
    this.name = "WebSearchError";
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#(x?[0-9a-f]+);|&(amp|lt|gt|quot|apos|nbsp);/gi, (entity, numeric?: string, named?: string) => {
      if (numeric) {
        const parsed = numeric.toLowerCase().startsWith("x") ? Number.parseInt(numeric.slice(1), 16) : Number.parseInt(numeric, 10);
        return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : "";
      }
      return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " } as Record<string, string>)[named?.toLowerCase() ?? ""] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const version = isIP(host);
  if (version === 4) {
    const octets = host.split(".").map(Number);
    return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || octets[0] === 169 && octets[1] === 254 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31 || octets[0] === 192 && octets[1] === 168 || octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
  }
  if (version === 6) return host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb") || (host.startsWith("::ffff:") && isPrivateHost(host.slice(7)));
  return false;
}

function safeResultUrl(raw: string) {
  try {
    const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || isPrivateHost(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isAllowedDomain(hostname: string, allowedDomains?: string[]) {
  if (!allowedDomains?.length || allowedDomains.includes("*")) return true;
  const host = hostname.toLowerCase();
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function configuredDomains() {
  const value = process.env.AI_WEB_ALLOWED_DOMAINS?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return value?.length ? value : undefined;
}

async function readBounded(response: Response, limit: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new WebSearchError("RESPONSE_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function extractResults(html: string, allowedDomains?: string[]) {
  const links: Array<{ rawUrl: string; title: string }> = [];
  const pattern = /<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) links.push({ rawUrl: match[1], title: decodeHtml(match[2]).slice(0, 200) });
  const snippets = [...html.matchAll(/<a\b[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => decodeHtml(match[1]).slice(0, 500));
  const results: WebSearchResult[] = [];
  const omitted: string[] = [];
  for (const [index, link] of links.entries()) {
    let rawUrl = link.rawUrl;
    try {
      const redirect = new URL(rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl);
      rawUrl = redirect.searchParams.get("uddg") ?? rawUrl;
    } catch {
      // Invalid result links are reported as omitted below.
    }
    const url = safeResultUrl(rawUrl);
    if (!url) {
      try { omitted.push(new URL(rawUrl).hostname); } catch { omitted.push("enlace no publico"); }
      continue;
    }
    const parsed = new URL(url);
    if (!isAllowedDomain(parsed.hostname, allowedDomains)) {
      omitted.push(parsed.hostname);
      continue;
    }
    if (results.some((item) => item.url === url)) continue;
    results.push({ title: link.title || parsed.hostname, url, snippet: snippets[index] ?? "", source: parsed.hostname });
    if (results.length >= MAX_WEB_RESULTS) break;
  }
  return { results, omitted: [...new Set(omitted)] };
}

export async function searchWeb(input: { query: string; consent: boolean; allowedDomains?: string[]; timeoutMs?: number; fetcher?: FetchLike }): Promise<WebSearchResponse> {
  if (!input.consent) throw new WebSearchError("CONSENT_REQUIRED");
  const query = input.query.trim().replace(/\s+/g, " ");
  if (!query || query.length > MAX_WEB_QUERY_LENGTH) throw new WebSearchError("INVALID_QUERY");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(100, Math.min(15_000, input.timeoutMs ?? DEFAULT_WEB_TIMEOUT_MS)));
  try {
    const endpoint = new URL(SEARCH_ENDPOINT);
    endpoint.searchParams.set("q", query);
    const response = await (input.fetcher ?? fetch)(endpoint, { method: "GET", redirect: "error", signal: controller.signal, headers: { Accept: "text/html", "User-Agent": "Aula1B/1.0" } });
    if (!response.ok) throw new WebSearchError("UNAVAILABLE");
    const html = await readBounded(response, MAX_WEB_RESPONSE_BYTES);
    return { source: "internet", query, ...extractResults(html, input.allowedDomains ?? configuredDomains()) };
  } catch (error) {
    if (error instanceof WebSearchError) throw error;
    if (controller.signal.aborted) throw new WebSearchError("TIMEOUT", { cause: error });
    throw new WebSearchError("UNAVAILABLE", { cause: error });
  } finally {
    clearTimeout(timer);
  }
}
