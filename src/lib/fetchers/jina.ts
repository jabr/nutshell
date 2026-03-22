export interface PageContent {
  title?: string;
  content: string;
  url: string;
}

export async function fetchWithJina(
  url: string,
  apiKey: string
): Promise<PageContent> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    data?: {
      title?: string;
      content?: string;
    };
  };

  const title = data?.data?.title;
  const content = data?.data?.content || "";

  if (!content) {
    throw new Error("Jina API returned empty content");
  }

  return {
    title,
    content,
    url,
  };
}
