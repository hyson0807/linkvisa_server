/**
 * Server-side document registry — mirrors the frontend getDocumentsForVisa logic.
 * Only the fields needed for CaseDocument creation are kept.
 */

interface DocDef {
  id: string;
  category: 'foreigner' | 'company' | 'generated';
  requiredForVisas: string[];
}

const ALL_VISAS = ['E-7', 'D-4', 'F-5', 'D-2', 'F-6', 'F-2', 'H-2', 'C-3'];

const documentRegistry: DocDef[] = [
  /* 공통 외국인 */
  { id: 'passport', category: 'foreigner', requiredForVisas: ALL_VISAS },
  { id: 'id_photo', category: 'foreigner', requiredForVisas: ['E-7', 'D-2', 'F-6', 'C-3'] },
  { id: 'alien_registration', category: 'foreigner', requiredForVisas: ['E-7', 'D-4', 'F-5', 'F-2', 'H-2'] },

  /* E-7 외국인 */
  { id: 'degree_cert', category: 'foreigner', requiredForVisas: ['E-7', 'F-5', 'F-2'] },
  { id: 'graduation_cert', category: 'foreigner', requiredForVisas: ['E-7', 'F-2'] },
  { id: 'career_cert', category: 'foreigner', requiredForVisas: ['E-7'] },
  { id: 'qualification_cert', category: 'foreigner', requiredForVisas: ['E-7'] },
  { id: 'resume', category: 'foreigner', requiredForVisas: ['E-7'] },
  { id: 'criminal_record_e7', category: 'foreigner', requiredForVisas: ['E-7'] },

  /* E-7 기업 */
  { id: 'business_reg', category: 'company', requiredForVisas: ['E-7', 'D-4', 'F-5', 'F-2', 'H-2', 'C-3'] },
  { id: 'corp_registry', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'employment_contract', category: 'company', requiredForVisas: ['E-7', 'D-4', 'F-2'] },
  { id: 'tax_cert', category: 'company', requiredForVisas: ['E-7', 'D-4', 'F-2'] },
  { id: 'insurance_member_list', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'company_intro', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'org_chart', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'job_description_doc', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'financial_statement', category: 'company', requiredForVisas: ['E-7'] },
  { id: 'vat_cert', category: 'company', requiredForVisas: ['E-7'] },

  /* E-7 행정사 작성 */
  { id: 'unified_application', category: 'generated', requiredForVisas: ['E-7', 'F-6', 'F-2'] },
  { id: 'occupation_report', category: 'generated', requiredForVisas: ['E-7', 'F-2'] },
  { id: 'employment_reason', category: 'generated', requiredForVisas: ['E-7'] },
  { id: 'status_change_app', category: 'generated', requiredForVisas: ['E-7', 'F-2'] },
  { id: 'stay_extension_app', category: 'generated', requiredForVisas: ['E-7'] },
  { id: 'visa_issuance_app', category: 'generated', requiredForVisas: ['E-7', 'F-6', 'C-3'] },

  /* F-6 한국인 배우자 */
  { id: 'family_relation_cert', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'marriage_cert', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'resident_register', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'resident_abstract', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'income_cert', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'wage_withholding', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'employment_cert_f6', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'health_insurance_cert', category: 'company', requiredForVisas: ['F-6'] },
  { id: 'housing_docs', category: 'company', requiredForVisas: ['F-6'] },

  /* F-6 외국인 배우자 */
  { id: 'marriage_cert_foreign', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'birth_cert', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'criminal_record', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'health_exam', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'marriage_statement', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'visa_application_form', category: 'foreigner', requiredForVisas: ['F-6'] },

  /* F-6 혼인 증빙 */
  { id: 'wedding_photos', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'family_photos', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'chat_records', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'call_records', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'dating_evidence', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'ceremony_photos', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'flight_tickets', category: 'foreigner', requiredForVisas: ['F-6'] },
  { id: 'entry_exit_records', category: 'foreigner', requiredForVisas: ['F-6'] },

  /* F-6 행정사 작성 */
  { id: 'spouse_invitation', category: 'generated', requiredForVisas: ['F-6'] },
  { id: 'identity_guarantee', category: 'generated', requiredForVisas: ['F-6'] },
  { id: 'marriage_background', category: 'generated', requiredForVisas: ['F-6'] },

  /* C-3 */
  { id: 'c3_application_form', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'c3_employment_or_enrollment', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'c3_stay_purpose_docs', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'c3_financial_docs', category: 'foreigner', requiredForVisas: ['C-3'] },
  { id: 'invitation_letter', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'event_guide', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'trade_contract', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'visit_purpose_docs', category: 'company', requiredForVisas: ['C-3'] },
  { id: 'stay_purpose_statement', category: 'generated', requiredForVisas: ['C-3'] },
  { id: 'invitation_reason', category: 'generated', requiredForVisas: ['C-3'] },

  /* F-2 */
  { id: 'income_proof_f2', category: 'foreigner', requiredForVisas: ['F-2'] },
  { id: 'topik_score', category: 'foreigner', requiredForVisas: ['F-2'] },
  { id: 'kiip_cert', category: 'foreigner', requiredForVisas: ['F-2'] },
  { id: 'employment_cert_f2', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'employment_status', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'local_gov_recommendation', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'local_visa_app', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'settlement_support', category: 'company', requiredForVisas: ['F-2'] },
  { id: 'local_linked_app', category: 'generated', requiredForVisas: ['F-2'] },

  /* D-4 */
  { id: 'tb_test', category: 'foreigner', requiredForVisas: ['D-4', 'H-2'] },
  { id: 'residence_proof', category: 'foreigner', requiredForVisas: ['D-4', 'F-5', 'F-2', 'H-2'] },

  /* D-2 */
  { id: 'transcript', category: 'foreigner', requiredForVisas: ['D-2', 'F-5'] },
  { id: 'admission_letter', category: 'foreigner', requiredForVisas: ['D-2'] },
  { id: 'enrollment_cert', category: 'foreigner', requiredForVisas: ['D-2'] },
  { id: 'financial_proof', category: 'foreigner', requiredForVisas: ['D-2'] },
  { id: 'health_cert', category: 'foreigner', requiredForVisas: ['D-2'] },

  /* F-5 */
  { id: 'job_description', category: 'generated', requiredForVisas: ['F-5'] },
];

export function getDocumentsForVisa(
  visaCode: string,
): { id: string; direction: 'input' | 'output' }[] {
  return documentRegistry
    .filter((d) => d.requiredForVisas.includes(visaCode))
    .map((d) => ({
      id: d.id,
      direction: d.category === 'generated' ? ('output' as const) : ('input' as const),
    }));
}
