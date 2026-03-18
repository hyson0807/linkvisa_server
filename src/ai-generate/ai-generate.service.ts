import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

const MAX_RETRIES = 3;
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'] as const;

export interface GenerateReasonResult {
  er_reason: string;
  er_tech_effect: string;
  er_utilization_plan: string;
  er_other: string;
}

@Injectable()
export class AiGenerateService {
  private readonly logger = new Logger(AiGenerateService.name);
  private readonly models: GenerativeModel[];

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    const genAI = new GoogleGenerativeAI(apiKey);
    this.models = MODELS.map((m) => genAI.getGenerativeModel({ model: m }));
  }

  async generateEmploymentReason(
    caseRecord: {
      manualFields: unknown;
      documents: Array<{ typeId: string; ocrResult: unknown }>;
    },
  ): Promise<GenerateReasonResult> {
    const manualFields = (caseRecord.manualFields as Record<string, string>) ?? {};
    const ocrData: Record<string, Record<string, string>> = {};

    for (const doc of caseRecord.documents) {
      if (doc.ocrResult && typeof doc.ocrResult === 'object') {
        ocrData[doc.typeId] = doc.ocrResult as Record<string, string>;
      }
    }

    const systemPrompt = `당신은 E-7 비자 신청용 고용사유서를 작성하는 전문 행정사입니다.
출입국관리사무소 심사관이 납득할 수 있도록 다음 4단계 논리구조로 작성하세요:

1. 고용사유 (er_reason): 내국인 구인 노력에도 불구하고 왜 외국인 채용이 필요한지.
   워크넷 등 구인 공고 게재, 면접 진행 등 구체적 노력과 적합인력 부재 사유를 포함.
2. 기술도입 및 고용효과 (er_tech_effect): 해당 외국인의 전문기술이 기업에 가져올
   기술이전, 매출증대, 신규 고용창출 등 계량적 기대효과.
3. 활용계획 (er_utilization_plan): 구체적 직무 배치, 프로젝트 투입,
   기술전수 계획 등 인력 활용 로드맵.
4. 기타사항 (er_other): 보충 설명이 필요한 사항.

문체: 공문서 문체 (~입니다/~습니다). 각 항목 3-5문장.
반드시 JSON 형식으로 응답: { "er_reason": "...", "er_tech_effect": "...",
"er_utilization_plan": "...", "er_other": "..." }`;

    const userPrompt = this.buildUserPrompt(manualFields, ocrData);

    for (const model of this.models) {
      try {
        const text = await this.callWithRetry(model, systemPrompt, userPrompt);
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

  private buildUserPrompt(
    manualFields: Record<string, string>,
    ocrData: Record<string, Record<string, string>>,
  ): string {
    const sections: string[] = [];

    // Company info
    const companyInfo: Record<string, string> = {};
    const companyFieldMap: Record<string, string> = {
      company_revenue: '총매출액',
      employee_count: '상시종업원수',
      company_description: '회사 및 사업소개',
      company_capital: '자본금',
      company_profit: '영업이익',
      foreign_expert_count: '외국전문인력수',
    };
    for (const [key, label] of Object.entries(companyFieldMap)) {
      if (manualFields[key]) companyInfo[label] = manualFields[key];
    }
    // OCR business registration
    const bizReg = ocrData['business_reg'] ?? {};
    if (bizReg['상호']) companyInfo['상호'] = bizReg['상호'];
    if (bizReg['사업자등록번호']) companyInfo['사업자등록번호'] = bizReg['사업자등록번호'];
    if (bizReg['대표자']) companyInfo['대표자'] = bizReg['대표자'];
    if (bizReg['사업장소재지']) companyInfo['사업장소재지'] = bizReg['사업장소재지'];

    if (Object.keys(companyInfo).length > 0) {
      sections.push(`[고용기업 정보]\n${Object.entries(companyInfo).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`);
    }

    // Specialist info
    const specialistFieldMap: Record<string, string> = {
      specialist_major: '전공/자격 직종',
      specialist_role: '담당 업무',
      specialist_duty: '세부 직무 내용',
    };
    const specialistInfo: string[] = [];
    for (const [key, label] of Object.entries(specialistFieldMap)) {
      if (manualFields[key]) specialistInfo.push(`- ${label}: ${manualFields[key]}`);
    }
    if (specialistInfo.length > 0) {
      sections.push(`[전문인력 정보]\n${specialistInfo.join('\n')}`);
    }

    // Passport / personal info
    const passport = ocrData['passport'] ?? {};
    const personalInfo: string[] = [];
    if (passport['성명(영문)']) personalInfo.push(`- 성명: ${passport['성명(영문)']}`);
    if (passport['국적']) personalInfo.push(`- 국적: ${passport['국적']}`);
    if (personalInfo.length > 0) {
      sections.push(`[신청인 정보]\n${personalInfo.join('\n')}`);
    }

    // Education
    const degree = ocrData['degree_cert'] ?? ocrData['graduation_cert'] ?? {};
    const eduInfo: string[] = [];
    if (degree['학교명']) eduInfo.push(`- 학교명: ${degree['학교명']}`);
    if (degree['학위']) eduInfo.push(`- 학위: ${degree['학위']}`);
    if (degree['전공']) eduInfo.push(`- 전공: ${degree['전공']}`);
    if (eduInfo.length > 0) {
      sections.push(`[학력]\n${eduInfo.join('\n')}`);
    }

    // Career
    const careerInfo: string[] = [];
    for (const prefix of ['career1', 'career2']) {
      const company = manualFields[`${prefix}_company`];
      const period = manualFields[`${prefix}_period`];
      const field = manualFields[`${prefix}_field`];
      const position = manualFields[`${prefix}_position`];
      if (company || field) {
        const parts = [company, period, field, position].filter(Boolean).join(' / ');
        careerInfo.push(`- ${parts}`);
      }
    }
    if (careerInfo.length > 0) {
      sections.push(`[경력]\n${careerInfo.join('\n')}`);
    }

    // Employment contract
    const contract = ocrData['employment_contract'] ?? {};
    const contractInfo: string[] = [];
    if (contract['근무내용']) contractInfo.push(`- 근무내용: ${contract['근무내용']}`);
    if (contract['직위']) contractInfo.push(`- 직위: ${contract['직위']}`);
    if (contract['급여']) contractInfo.push(`- 급여: ${contract['급여']}`);
    if (contract['계약기간']) contractInfo.push(`- 계약기간: ${contract['계약기간']}`);
    if (contractInfo.length > 0) {
      sections.push(`[근로계약 정보]\n${contractInfo.join('\n')}`);
    }

    return sections.length > 0
      ? `다음 정보를 바탕으로 고용사유서의 "고용사유 및 인력활용계획" 섹션을 작성해주세요.\n\n${sections.join('\n\n')}`
      : '주어진 정보가 제한적이지만, E-7 비자 고용사유서의 "고용사유 및 인력활용계획" 섹션 초안을 작성해주세요.';
  }

  private async callWithRetry(
    model: GenerativeModel,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        this.logger.log(`Calling ${model.model} (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { role: 'model', parts: [{ text: systemPrompt }] },
        });
        const text = result.response.text();
        this.logger.log(`Gemini response: ${text.slice(0, 200)}`);
        return text;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const isRateLimit = msg.includes('429') || msg.includes('Too Many Requests');

        if (isRateLimit && attempt < MAX_RETRIES - 1) {
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

  private parseJsonResponse(text: string): GenerateReasonResult {
    const defaultResult: GenerateReasonResult = {
      er_reason: '',
      er_tech_effect: '',
      er_utilization_plan: '',
      er_other: '',
    };

    const tryParse = (src: string): GenerateReasonResult | null => {
      try {
        const parsed = JSON.parse(src);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            er_reason: String(parsed.er_reason ?? ''),
            er_tech_effect: String(parsed.er_tech_effect ?? ''),
            er_utilization_plan: String(parsed.er_utilization_plan ?? ''),
            er_other: String(parsed.er_other ?? ''),
          };
        }
      } catch {
        // ignore
      }
      return null;
    };

    const direct = tryParse(text);
    if (direct) return direct;

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const fenced = tryParse(jsonMatch[1].trim());
      if (fenced) return fenced;
    }

    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      const braced = tryParse(braceMatch[0]);
      if (braced) return braced;
    }

    this.logger.warn(`Failed to parse Gemini response as JSON: ${text}`);
    return defaultResult;
  }
}
