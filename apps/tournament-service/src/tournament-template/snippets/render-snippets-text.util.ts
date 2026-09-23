export function renderSnippetsAsText(
  snippets: Record<string, unknown>,
): string {
  return Object.entries(snippets)
    .map(([locale, snippet]) => `${locale}:\n${formatSnippetJson(snippet)},`)
    .join('\n\n');
}

function formatSnippetJson(snippet: unknown): string {
  return JSON.stringify(snippet, null, 2).replace(
    /"notShowForGeoIps": \[\n([\s\S]*?)\n\s*\]/,
    (_match, body: string) => {
      const items = body
        .split(',\n')
        .map((item) => item.trim())
        .filter(Boolean);
      return `"notShowForGeoIps": [${items.join(', ')}]`;
    },
  );
}
