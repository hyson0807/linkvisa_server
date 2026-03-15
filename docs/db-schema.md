# LinkVisa DB Schema 설계 문서

## 개요

LinkVisa 케이스 관리 시스템의 PostgreSQL 데이터베이스 스키마 설계 문서입니다.
NestJS + Prisma + PostgreSQL 기반이며, 케이스 생성부터 서류 업로드(공유 링크), OCR 추출, PDF 양식 자동 입력까지의 전체 플로우를 지원합니다.

---

## 테이블 관계도 (ERD)

```
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ id          (PK)    │
│ email       (UQ)    │
│ password            │
│ name                │
│ refreshToken        │
│ createdAt           │
│ updatedAt           │
└─────────┬───────────┘
          │ 1:N
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                          cases                                   │
├──────────────────────────────────────────────────────────────────┤
│ id               (PK)                                            │
│ ownerId          (FK → users.id, nullable)     -- 케이스 소유자    │
│ sessionToken     (nullable)                   -- 게스트 식별 토큰│
│ caseName                                      -- 업무 이름       │
│ foreignerName                                 -- 외국인명        │
│ companyName                                   -- 회사/학교/기관명│
│ visaType                                      -- "E-7", "D-2" 등│
│ visaSubtype                                   -- "E-7-1" 등     │
│ applicationType                               -- 업무내용        │
│ status                                        -- 케이스 상태     │
│ manualFields     (JSONB)                      -- 수동 입력 필드  │
│ deletedAt                                     -- soft delete     │
│ createdAt / updatedAt                                            │
└──────┬──────────────┬──────────────┬─────────────────────────────┘
       │ 1:N          │ 1:N
       │              │
       ▼              ▼
┌──────────────┐ ┌──────────┐
│share_links   │ │case_     │
├──────────────┤ │documents │
│id      (PK)  │ ├──────────┤
│caseId  (FK)  │ │id   (PK) │
│token   (UQ)  │ │caseId(FK)│
│type          │ │typeId    │
│expiresAt     │ │direction │
│usedAt        │ │status    │
│isActive      │ │custom*   │
│createdAt     │ │ocrResult │
└──────────────┘ │  (JSONB) │
                 │aiContent │
                 │errorMsg  │
                 │createdAt │
                 │updatedAt │
                 └────┬─────┘
                      │ 1:N
                      ▼
               ┌──────────────┐
               │document_files│
               ├──────────────┤
               │id      (PK)  │
               │documentId(FK)│
               │fileName      │
               │fileSize      │
               │mimeType      │
               │storagePath   │
               │version       │
               │createdAt     │
               └──────────────┘


```

### 관계 요약

| 관계 | 설명 |
|------|------|
| `User` → `Case` | 1:N — 로그인 사용자는 여러 케이스 소유 (비로그인 케이스는 ownerId=null) |
| `Case` → `CaseDocument` | 1:N — 케이스에 여러 서류 포함 |
| `Case` → `ShareLink` | 1:N — 외국인/기업/학생용 업로드 링크 |
| `CaseDocument` → `DocumentFile` | 1:N — 서류당 여러 파일 버전 |

---

## 테이블 상세 정의

### 1. users (기존)

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK, default uuid() | |
| email | String | UNIQUE | 로그인 이메일 |
| password | String | NOT NULL | bcrypt 해시 |
| name | String | nullable | 사용자명 |
| refreshToken | String | nullable | 해시된 리프레시 토큰 |
| createdAt | DateTime | default now() | |
| updatedAt | DateTime | auto | |

> 기존 테이블. 컬럼 변경 없이 `cases` 관계만 추가.

---

### 2. cases

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK | |
| ownerId | UUID | FK → users.id, nullable | 케이스 소유자 (비로그인 시 null) |
| sessionToken | String | nullable | 게스트 케이스 식별용 토큰 |
| caseName | String | default "" | 업무 이름 |
| foreignerName | String | default "" | 외국인명 |
| companyName | String | default "" | 회사명/학교명/초청기관명 |
| visaType | String | NOT NULL | 비자 종류 ("E-7", "D-2" 등) |
| visaSubtype | String | nullable | 비자 세부 유형 ("E-7-1" 등) |
| applicationType | String | nullable | 업무 내용 ("체류자격변경허가" 등) |
| status | String | default "draft" | 케이스 상태 |
| manualFields | JSONB | default {} | 수동 입력 필드 (Record<string, string>) |
| deletedAt | DateTime | nullable | soft delete 타임스탬프 |
| createdAt | DateTime | default now() | |
| updatedAt | DateTime | auto | |

**설계 근거:**
- `ownerId` nullable: 비로그인 사용자도 케이스 생성 가능. 로그인/회원가입 후 `POST /api/cases/claim`으로 소유권 이전
- `sessionToken`: 비로그인 사용자의 케이스 식별. claim 후 null로 초기화
- `manualFields`를 JSONB로 저장: 필드 키가 비자 종류마다 다르고, 전체를 한 번에 읽고 쓰는 패턴이므로 별도 테이블보다 효율적
- `applicationType`, `visaType`을 String으로: enum은 새 유형 추가 시 마이그레이션 필요, String이 유연
- `deletedAt` soft delete: 케이스에 많은 작업이 포함되어 실수로 삭제 방지

**인덱스:**
- `(ownerId)` — 사용자별 케이스 조회
- `(sessionToken)` — 게스트 케이스 조회/claim
- `(status)` — 상태별 필터
- `(visaType)` — 비자 유형별 필터/통계
- `(createdAt)` — 최신순 정렬
- `(ownerId, status)` — 대시보드: 내 케이스 상태별 필터

**status 값:**
| 값 | 설명 |
|----|------|
| `draft` | 초안 |
| `documents-pending` | 서류 대기 중 |
| `ocr-in-progress` | OCR 처리 중 |
| `generation-ready` | 문서 생성 준비 완료 |
| `complete` | 완료 |

**applicationType 값:**
| 값 | 설명 |
|----|------|
| 외국인등록 | 외국인 등록 |
| 등록증재발급 | 등록증 재발급 |
| 체류기간연장허가 | 체류기간 연장허가 |
| 체류자격변경허가 | 체류자격 변경허가 |
| 체류자격부여 | 체류자격 부여 |
| 근무처변경추가 | 근무처 변경/추가허가/신고 |
| 체류지변경신고 | 체류지 변경신고 |
| 등록사항변경신고 | 등록사항 변경신고 |

---

### 3. share_links

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK | |
| caseId | UUID | FK → cases.id, CASCADE | 연결된 케이스 |
| token | UUID | UNIQUE, default uuid() | URL에 사용되는 토큰 |
| type | String | NOT NULL | 링크 유형 |
| expiresAt | DateTime | NOT NULL | 만료 시각 |
| usedAt | DateTime | nullable | 제출 완료 시각 |
| isActive | Boolean | default true | 활성 여부 |
| createdAt | DateTime | default now() | |

**설계 근거:**
- 케이스당 여러 링크 가능 (외국인용, 기업용, 학생용 각각)
- `expiresAt`로 만료 관리, `isActive`로 수동 비활성화
- 케이스 삭제 시 Cascade 삭제

**type 값:**
| 값 | 설명 |
|----|------|
| `foreigner` | 외국인 서류 업로드용 |
| `company` | 기업/학교/초청기관 서류 업로드용 |
| `student` | D-2 학생 제출용 |

**인덱스:**
- `(token)` UNIQUE — 링크 접근 시 O(1) 조회
- `(caseId)` — 케이스별 링크 목록

---

### 4. case_documents

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK | |
| caseId | UUID | FK → cases.id, CASCADE | 소속 케이스 |
| typeId | String | NOT NULL | 서류 유형 ID (document-registry 참조) |
| direction | String | NOT NULL | "input" (업로드 서류) \| "output" (생성 서류) |
| status | String | default "pending" | 서류 처리 상태 |
| isCustom | Boolean | default false | 커스텀 서류 여부 |
| customLabel | String | nullable | 커스텀 서류 이름 |
| customCategory | String | nullable | 커스텀 서류 카테고리 |
| ocrResult | JSONB | nullable | OCR 추출 결과 (Record<string, string>) |
| aiContent | String | nullable | AI 생성 콘텐츠 |
| errorMessage | String | nullable | 에러 메시지 |
| createdAt | DateTime | default now() | |
| updatedAt | DateTime | auto | |

**설계 근거:**
- `direction`으로 입력/출력 서류 구분: input(여권, 사업자등록증 등 업로드 서류), output(통합신청서 등 생성 서류)
- `typeId`는 프론트엔드 `document-registry`의 ID를 참조 (DB에 서류 유형 정의를 넣지 않음 — UI 메타데이터이므로)
- `ocrResult`를 JSONB로: 서류 유형마다 추출 필드가 다름 (input 서류에서 사용)
- `aiContent`: AI 생성 콘텐츠 (output 서류에서 사용)
- `isCustom` + `customLabel`/`customCategory`: 사용자가 추가한 비정형 서류 지원

**status 값:**
| 값 | 설명 |
|----|------|
| `pending` | 업로드 대기 |
| `uploaded` | 업로드 완료 |
| `ocr-processing` | OCR 처리 중 |
| `ocr-complete` | OCR 완료 |
| `ai-generating` | AI 생성 중 |
| `complete` | 완료 |
| `error` | 에러 |

**인덱스:**
- `(caseId)` — 케이스의 서류 목록
- `(caseId, typeId)` — 특정 서류 유형 조회
- `(status)` — 상태별 필터

> `typeId`는 프론트엔드 `document-registry`의 ID를 참조합니다.
> 서류 유형 정의(label, category, ocrFields 등)는 UI 메타데이터이므로 DB에 저장하지 않습니다.

---

### 5. document_files

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | UUID | PK | |
| documentId | UUID | FK → case_documents.id, CASCADE | 소속 서류 |
| fileName | String | NOT NULL | 원본 파일명 |
| fileSize | Int | NOT NULL | 파일 크기 (bytes) |
| mimeType | String | NOT NULL | MIME 타입 |
| storagePath | String | NOT NULL | S3 키 또는 URL |
| version | Int | default 1 | 파일 버전 (재업로드 시 증가) |
| createdAt | DateTime | default now() | |

**인덱스:**
- `(documentId)` — 서류의 파일 목록

> 실제 파일은 S3/클라우드 스토리지에 저장됩니다.
> DB에는 메타데이터만 저장하여 조회 성능을 보장합니다.

---

## 주요 인덱스 요약

| 인덱스 | 용도 |
|--------|------|
| `Case(ownerId, status)` | 대시보드: 내 케이스 상태별 필터 |
| `Case(visaType)` | 비자 유형별 필터/통계 |
| `ShareLink(token)` UNIQUE | 공유 링크 접근 시 O(1) 조회 |
| `CaseDocument(caseId, typeId)` | 케이스 내 특정 서류 조회 |
| `DocumentFile(documentId)` | 서류의 파일 목록 조회 |

---

## 데이터 흐름

```
1. 케이스 생성
   사용자 → POST /api/cases (인증 선택적)
   → 로그인: ownerId = user.id, sessionToken = null
   → 비로그인: ownerId = null, sessionToken = body.sessionToken
   → 비자 유형에 따른 case_documents 자동 생성 (status: pending)

2. 서류 업로드 (공유 링크)
   외국인/기업 → GET /api/share/:token (링크 유효성 확인, 인증 불필요)
              → POST /api/share/:token/upload (파일 업로드)
   → document_files에 메타데이터 저장
   → S3에 파일 업로드
   → case_documents.status → "uploaded"

3. OCR 처리
   시스템 → case_documents.status → "ocr-processing"
         → OCR 엔진 호출
         → case_documents.ocrResult에 결과 저장 (JSONB)
         → case_documents.status → "ocr-complete"

4. 수동 입력
   케이스 소유자 → PATCH /api/cases/:id/manual-fields
               → cases.manualFields 업데이트 (JSONB)

5. PDF 생성
   시스템 → output 방향의 case_documents 대상
         → input 서류의 ocrResult + cases.manualFields 데이터 조합
         → PDF 양식에 데이터 입력 후 완성된 PDF를 R2에 저장
         → document_files에 메타데이터 저장
         → case_documents.status → "complete"
```

---

## 설계 원칙

1. **JSONB 활용**: `manualFields`, `ocrResult`는 유동적 데이터이므로 JSONB로 저장.
2. **String enum 패턴**: `status`, `visaType`, `applicationType` 등은 PostgreSQL enum 대신 String 사용. 새 값 추가 시 마이그레이션 불필요.
3. **파일 분리**: 실제 파일은 S3, DB는 메타데이터만. base64 DataURL 패턴(현재 IndexedDB)에서 탈피.
4. **Soft Delete**: 케이스는 `deletedAt`으로 soft delete. 복구 가능성 보장.
5. **Cascade Delete**: 하위 엔티티(documents, files, links)는 케이스 삭제 시 자동 삭제.
6. **서류 유형은 코드에서 관리**: `document-registry`의 서류 정의는 UI 메타데이터이므로 DB에 저장하지 않음.

---

## 마이그레이션 전략

1. `prisma migrate dev --name add_case_management`로 스키마 적용
2. 기존 User 테이블은 컬럼 변경 없이 관계만 추가
3. 프론트엔드 IndexedDB → 서버 API 전환 완료 (케이스 CRUD, 파일 업로드)
