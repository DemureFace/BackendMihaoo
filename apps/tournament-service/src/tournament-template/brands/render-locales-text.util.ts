export function renderLocalesAsText(templates: Record<string, string>): string {
  return Object.entries(templates)
    .map(([locale, template]) => `${locale}:\n${template}`)
    .join('\n\n');
}
