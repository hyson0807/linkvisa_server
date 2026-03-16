import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { StorageService } from '../storage/storage.service';

const MAX_RETRIES = 3;
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'] as const;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly models: GenerativeModel[];

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    const genAI = new GoogleGenerativeAI(apiKey);
    this.models = MODELS.map((m) => genAI.getGenerativeModel({ model: m }));
  }

  async processDocument(
    storagePath: string,
    mimeType: string,
  ): Promise<Record<string, string>> {
    this.logger.log(`Downloading file: ${storagePath}`);
    const buffer = await this.storageService.getObjectBuffer(storagePath);
    const base64 = buffer.toString('base64');
    this.logger.log(`File downloaded: ${buffer.length} bytes`);

    const prompt = `이 한국 비자/행정 서류 이미지를 분석하여 모든 주요 정보를 추출하세요.
문서에 포함된 이름, 번호, 날짜, 주소, 기관명 등 모든 핵심 항목을 빠짐없이 추출하세요.
반드시 flat한 JSON 객체로만 응답하세요. 중첩 객체나 배열 없이, 키는 한국어 필드명, 값은 문자열입니다.
표 형태의 데이터는 "항목1_필드명" 형식으로 풀어서 작성하세요.
필드값을 찾을 수 없으면 해당 키를 생략하세요.`;

    const inlineData = { data: base64, mimeType };

    // Try each model, with retries on 429
    for (const model of this.models) {
      try {
        const text = await this.callWithRetry(model, inlineData, prompt);
        return this.parseJsonResponse(text);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('429') || msg.includes('quota')) {
          this.logger.warn(`Model ${model.model} quota exhausted, trying next model...`);
          continue;
        }
        throw error;
      }
    }

    throw new Error('All Gemini models quota exhausted. Please check your API billing.');
  }

  private async callWithRetry(
    model: GenerativeModel,
    inlineData: { data: string; mimeType: string },
    prompt: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        this.logger.log(`Calling ${model.model} (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const result = await model.generateContent([{ inlineData }, prompt]);
        const text = result.response.text();
        this.logger.log(`Gemini response: ${text.slice(0, 200)}`);
        return text;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const isRateLimit = msg.includes('429') || msg.includes('Too Many Requests');

        if (isRateLimit && attempt < MAX_RETRIES - 1) {
          // Extract retry delay from error message, default 15s
          const delayMatch = msg.match(/retry in ([\d.]+)s/i);
          const delaySec = delayMatch ? Math.ceil(parseFloat(delayMatch[1])) : 15;
          this.logger.warn(`Rate limited, retrying in ${delaySec}s...`);
          await new Promise((r) => setTimeout(r, delaySec * 1000));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private parseJsonResponse(
    text: string,
  ): Record<string, string> {
    const tryParse = (src: string): Record<string, string> | null => {
      try {
        const parsed = JSON.parse(src);
        if (typeof parsed === 'object' && parsed !== null) {
          return this.flattenToStrings(parsed);
        }
      } catch {
        // ignore
      }
      return null;
    };

    // Try direct JSON parse first
    const direct = tryParse(text);
    if (direct) return direct;

    // Try regex extraction for ```json ... ``` blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const fenced = tryParse(jsonMatch[1].trim());
      if (fenced) return fenced;
    }

    // Try finding any JSON object in the text
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      const braced = tryParse(braceMatch[0]);
      if (braced) return braced;
    }

    this.logger.warn(`Failed to parse Gemini response as JSON: ${text}`);
    return {};
  }

  /** Flatten nested objects/arrays into a flat Record<string, string> */
  private flattenToStrings(
    obj: Record<string, unknown>,
    prefix = '',
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        result[fullKey] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[fullKey] = String(value);
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(result, this.flattenToStrings(item as Record<string, unknown>, `${fullKey}${i + 1}`));
          } else {
            result[`${fullKey}${i + 1}`] = String(item);
          }
        });
      } else if (typeof value === 'object') {
        Object.assign(result, this.flattenToStrings(value as Record<string, unknown>, fullKey));
      }
    }
    return result;
  }
}
