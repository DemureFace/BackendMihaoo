import { BadRequestException } from '@nestjs/common';

export function parseFigmaUrl(figmaUrl: string) {
  try {
    const url = new URL(figmaUrl);

    const fileKeyMatch = url.pathname.match(/\/(?:file|design)\/([^/]+)/);
    const fileKey = fileKeyMatch?.[1] || null;

    const rawNodeId = url.searchParams.get('node-id');
    const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ':') : null;

    return {
      fileKey,
      nodeId,
    };
  } catch {
    throw new BadRequestException('Invalid Figma URL');
  }
}

export function extractFigmaFileKey(figmaFileUrl?: string) {
  if (!figmaFileUrl) return null;

  const match = figmaFileUrl.match(/figma\.com\/(?:file|design)\/([^/?]+)/);

  return match?.[1] || null;
}
