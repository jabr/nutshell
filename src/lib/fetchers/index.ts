import { fetchWithJina, type PageContent } from "./jina";
import type { Config } from "../../types";

export async function fetchPage(
  url: string,
  config: Config
): Promise<PageContent> {
  const jinaConfig = config.fetchers?.jina;

  if (jinaConfig?.enabled && jinaConfig?.api_key) {
    try {
      return await fetchWithJina(url, jinaConfig.api_key);
    } catch (e) {
      console.warn(`Jina fetch failed, falling back to basic fetch: ${e}`);
    }
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const content = stripHtml(html);
  const title = extractTitle(html);

  return { title, content, url };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
}
