/**
 * Server-side document registry — mirrors the frontend getDocumentsForVisa logic.
 * Used as a template when creating case documents.
 */

interface DocDef {
  id: string;
  label: string;
  category: 'foreigner' | 'company' | 'generated';
  requiredForVisas: string[];
}

const ALL_VISAS = ['E-7', 'D-4', 'F-5', 'D-2', 'F-6', 'F-2', 'H-2', 'C-3'];

const documentRegistry: DocDef[] = [
  /* 공통 외국인 */
  { id: 'passport', label: '여권 사본', category: 'foreigner', requiredForVisas: ALL_VISAS },
  { id: 'id_photo', label: '증명사진 (3.5x4.5)', category: 'foreigner', requiredForVisas: ['E-7', 'D-2', 'F-6', 'C-3'] },
  { id: 'alien_registration', label: '외국인등록증 사본', category: 'foreigner', requiredForVisas: ['E-7', 'D-4', 'F-5', 'F-2', 'H-2'] },

  /* E-7 외국인 */
  { id: 'degree_cert', label: '학위증', category: 'foreigner', requiredForVisas: ['E-7', 'F-5', 'F-2'] },
  { id: 'graduation_cert', label: '졸업증명서', category: 'foreigner', requiredForVisas: ['E-7', 'F-2'] },
  { id: 'career_cert', label: '경력증명서', category: 'foreigner', requiredForVisas: ['E-7'] },
  { id: 'qualification_cert', label: '자격증', category: 'foreigner', requiredForVisas: ['E-7'] },
  { id: 'resume', label: '이력서', category: 'foreigner', requiredForVisas: ['E-7'] },
  { id: 'criminal_record_e7', label: '범죄경력증명서', category: 'foreigner', requiredForVisas: ['E-7'] },

  /* E-7 기업 */
  { id: 'business_reg', label: '사업자등록증', category: 'company', requiredForVisas: ['E-7', 'D-4', 'F-5', 'F-2', 'H-2', 'C-3'] },
  { id: 'corp_registry', label: '법인등기부등본', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'employment_contract', label: '고용계약서', category: 'company', requiredForVisas: ['E-7', 'D-4', 'F-2'] },
  { id: 'tax_cert', label: '납세증명서', category: 'company', requiredForVisas: ['E-7', 'D-4', 'F-2'] },
  { id: 'insurance_member_list', label: '4대보험 가입자 명부', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'company_intro', label: '회사소개서', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'org_chart', label: '조직도', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'job_description_doc', label: '직무기술서 (Job Description)', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'financial_statement', label: '재무제표', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'vat_cert', label: '부가가치세 과세표준증명', category: 'company', requiredForVisas: ['E-7'] },

  /* E-7 행정사 작성 */
  { id: 'unified_application', label: '통합신청서', category: 'generated', requiredForVisas: ['E-7', 'F-6', 'F-2'] },
  { id: 'occupation_report', label: '외국인 직업신고서', category: 'generated', requiredForVisas: ['E-7', 'F-2'] },
  { id: 'employment_reason', label: '고용사유서', category: 'generated', requiredForVisas: ['E-7'] },
  { id: 'status_change_app', label: '체류자격 변경 신청서', category: 'generated', requiredForVisas: ['E-7', 'F-2'] },
  { id: 'stay_extension_app', label: '체류기간 연장 신청서', category: 'generated', requiredForVisas: ['E-7'] },
  { id: 'visa_issuance_app', label: '사증발급인정서 신청서', category: 'generated', requiredForVisas: ['E-7', 'F-6', 'C-3'] },

  /* F-6 한국인 배우자 */
  { id: 'family_relation_cert', label: '가족관계증명서', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'marriage_cert', label: '혼인관계증명서', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'resident_register', label: '주민등록등본', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'resident_abstract', label: '주민등록초본', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'income_cert', label: '소득금액증명', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'wage_withholding', label: '근로소득 원천징수영수증', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'employment_cert_f6', label: '재직증명서', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'health_insurance_cert', label: '건강보험 납부확인서', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'housing_docs', label: '주거 관련 서류 (등기부등본/임대차계약서)', category: 'company', requiredForVisas: ['F-6'] },

  /* F-6 외국인 배우자 */
  { id: 'marriage_cert_foreign', label: '결혼증명서 (본국 발급)', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'birth_cert', label: '출생증명서', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'criminal_record', label: '범죄경력증명서', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'health_exam', label: '건강진단서', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'marriage_statement', label: '결혼경위서', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'visa_application_form', label: '비자 신청서', category: 'foreigner', requiredForVisas: ['F-6'] },

  /* F-6 혼인 증빙 */
  { id: 'wedding_photos', label: '결혼사진', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'family_photos', label: '가족사진', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'chat_records', label: '카카오톡 대화', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'call_records', label: '통화기록', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'dating_evidence', label: '교제 증빙', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'ceremony_photos', label: '결혼식 사진', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'flight_tickets', label: '항공권', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'entry_exit_records', label: '출입국 기록', category: 'foreigner', requiredForVisas: ['F-6'] },

  /* F-6 행정사 작성 */
  { id: 'spouse_invitation', label: '외국인 배우자 초청장', category: 'generated', requiredForVisas: ['F-6'] },
  { id: 'identity_guarantee', label: '신원보증서', category: 'generated', requiredForVisas: ['F-6'] },
  { id: 'marriage_background', label: '결혼배경진술서 정리', category: 'generated', requiredForVisas: ['F-6'] },

  /* C-3 */
  { id: 'c3_application_form', label: '신청서', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'c3_employment_or_enrollment', label: '재직증명서 또는 재학증명서', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'c3_stay_purpose_docs', label: '체류목적 설명자료', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'c3_financial_docs', label: '재정능력 입증서류', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'invitation_letter', label: '초청장', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'event_guide', label: '행사 안내문', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'trade_contract', label: '거래계약서', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'visit_purpose_docs', label: '방문 목적 관련 자료', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'stay_purpose_statement', label: '체류목적 설명서 정리', category: 'generated', requiredForVisas: ['C-3'] },
  { id: 'invitation_reason', label: '초청 사유서', category: 'generated', requiredForVisas: ['C-3'] },

  /* F-2 */
  { id: 'income_proof_f2', label: '소득 증빙', category: 'foreigner', requiredForVisas: ['F-2'] },
  { id: 'topik_score', label: 'TOPIK 성적표', category: 'foreigner', requiredForVisas: ['F-2'] },
  { id: 'kiip_cert', label: 'KIIP 수료증', category: 'foreigner', requiredForVisas: ['F-2'] },
  { id: 'employment_cert_f2', label: '재직증명서', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'employment_status', label: '고용현황 자료', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'local_gov_recommendation', label: '지자체 추천서', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'local_visa_app', label: '지역특화비자 신청서', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'settlement_support', label: '정착지원 확인서', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'local_linked_app', label: '지자체 추천 연계 신청서', category: 'generated', requiredForVisas: ['F-2'] },

  /* D-4 */
  { id: 'tb_test', label: '결핵진단서', category: 'foreigner', requiredForVisas: ['D-4', 'H-2'] },
  { id: 'residence_proof', label: '체류지 입증서류', category: 'foreigner', requiredForVisas: ['D-4', 'F-5', 'F-2', 'H-2'] },

  /* D-2 */
  { id: 'transcript', label: '성적증명서', category: 'foreigner', requiredForVisas: ['D-2', 'F-5'] },
  { id: 'admission_letter', label: '입학허가서', category: 'foreigner', requiredForVisas: ['D-2'] },
  { id: 'enrollment_cert', label: '재학증명서', category: 'foreigner', requiredForVisas: ['D-2'] },
  { id: 'financial_proof', label: '재정입증서류 (잔고증명 등)', category: 'foreigner', requiredForVisas: ['D-2'] },
  { id: 'health_cert', label: '건강진단서', category: 'foreigner', requiredForVisas: ['D-2'] },

  /* F-5 */
  { id: 'job_description', label: '직무기술서', category: 'generated', requiredForVisas: ['F-5'] },
];

export function getDocumentsForVisa(
  visaCode: string,
): { id: string; label: string; category: string; direction: 'input' | 'output' }[] {
  return documentRegistry
    .filter((d) => d.requiredForVisas.includes(visaCode))
    .map((d) => ({
      id: d.id,
      label: d.label,
      category: d.category,
      direction: d.category === 'generated' ? ('output' as const) : ('input' as const),
    }));
}
