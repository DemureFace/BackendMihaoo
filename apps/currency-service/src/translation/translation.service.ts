import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

const CURRENCY_TOKEN_RE = /(?:[€$£]\s?\d[\d.,\s]*|\d[\d.,\s]*\s?(?:[€$£]|kr))/g;

interface GoogleTranslateResponseBody {
  data?: {
    translations?: { translatedText?: string }[];
  };
}

@Injectable()
export class TranslationService {
  private readonly endpoint =
    'https://translation.googleapis.com/language/translate/v2';
  private readonly apiKey: string;
  private readonly cache = new Map<string, string>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>(
      'GOOGLE_TRANSLATE_API_KEY',
    );
  }

  async translate(text: string, target: string): Promise<string> {
    if (!text || !text.trim()) return text;

    const cacheKey = `${target} ${text}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const { masked, map } = this.protectTokens(text);

    const translated =
      target === 'en-au'
        ? this.applyAuWording(masked)
        : await this.callGoogleTranslate(masked, target);

    const restored = this.decodeEntities(this.restoreTokens(translated, map));
    this.cache.set(cacheKey, restored);
    return restored;
  }

  private async callGoogleTranslate(
    text: string,
    target: string,
  ): Promise<string> {
    const googleTarget = target === 'gr' ? 'el' : target.replace(/-.+$/, '');

    try {
      const response = await firstValueFrom(
        this.httpService.post<GoogleTranslateResponseBody>(
          `${this.endpoint}?key=${this.apiKey}`,
          {
            q: text,
            source: 'en',
            target: googleTarget,
            format: 'html',
          },
        ),
      );
      return response.data.data?.translations?.[0]?.translatedText ?? text;
    } catch {
      return text;
    }
  }

  private applyAuWording(text: string): string {
    const casePreserve = (replacement: string, source: string) => {
      if (source === source.toUpperCase()) return replacement.toUpperCase();
      if (source[0] === source[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }
      return replacement;
    };

    return text
      .replace(/\bslots\b/gi, (m) => casePreserve('pokies', m))
      .replace(/\bslot\b/gi, (m) => casePreserve('pokie', m));
  }

  private protectTokens(text: string): { masked: string; map: string[] } {
    const map: string[] = [];
    const masked = text.replace(CURRENCY_TOKEN_RE, (m) => {
      map.push(m);
      return `[[N${map.length - 1}]]`;
    });
    return { masked, map };
  }

  private restoreTokens(text: string, map: string[]): string {
    return text.replace(/\[\[N(\d+)\]\]/g, (_match, i) => map[+i] ?? '');
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
