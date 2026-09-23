import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { FigmaRateLimitService } from './figma-rate-limit.service';

@Injectable()
export class FigmaApiService {
  constructor(private readonly figmaRateLimitService: FigmaRateLimitService) {}

  private getFigmaToken() {
    const token = process.env.FIGMA_TOKEN;

    if (!token) {
      throw new BadRequestException('FIGMA_TOKEN is not configured');
    }

    return token;
  }

  async getFigmaNode(figmaFileKey: string, nodeId: string) {
    this.figmaRateLimitService.assertAvailable();

    try {
      const token = this.getFigmaToken();

      const response = await axios.get(
        `https://api.figma.com/v1/files/${figmaFileKey}/nodes`,
        {
          headers: {
            'X-Figma-Token': token,
          },
          params: {
            ids: nodeId,
          },
        },
      );

      // The endpoint wraps the requested node under nodes[nodeId].document;
      // the top-level `name` is the file title, not this node's name.
      return response.data?.nodes?.[nodeId]?.document || null;
    } catch (error: any) {
      if (this.figmaRateLimitService.isRateLimitError(error)) {
        const retry = this.figmaRateLimitService.activateCooldown(error);

        throw new BadRequestException({
          message: 'Rate limit exceeded',
          ...retry,
        });
      }

      throw error;
    }
  }

  async getFigmaImageUrls(
    figmaFileKey: string,
    nodeIds: string[],
    scale: number,
  ) {
    this.figmaRateLimitService.assertAvailable();

    try {
      const token = this.getFigmaToken();

      const response = await axios.get(
        `https://api.figma.com/v1/images/${figmaFileKey}`,
        {
          headers: {
            'X-Figma-Token': token,
          },
          params: {
            ids: nodeIds.join(','),
            format: 'png',
            scale,
          },
        },
      );

      return response.data?.images || {};
    } catch (error: any) {
      if (this.figmaRateLimitService.isRateLimitError(error)) {
        const retry = this.figmaRateLimitService.activateCooldown(error);

        throw new BadRequestException({
          message: 'Rate limit exceeded',
          ...retry,
        });
      }

      throw error;
    }
  }

  async downloadImage(url: string) {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }
}
