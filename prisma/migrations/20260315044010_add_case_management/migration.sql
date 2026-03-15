-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "sessionToken" TEXT,
    "caseName" TEXT NOT NULL DEFAULT '',
    "foreignerName" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "visaType" TEXT NOT NULL,
    "visaSubtype" TEXT,
    "applicationType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "manualFields" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "customLabel" TEXT,
    "customCategory" TEXT,
    "ocrResult" JSONB,
    "aiContent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cases_ownerId_idx" ON "cases"("ownerId");

-- CreateIndex
CREATE INDEX "cases_sessionToken_idx" ON "cases"("sessionToken");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_visaType_idx" ON "cases"("visaType");

-- CreateIndex
CREATE INDEX "cases_createdAt_idx" ON "cases"("createdAt");

-- CreateIndex
CREATE INDEX "cases_ownerId_status_idx" ON "cases"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_caseId_idx" ON "share_links"("caseId");

-- CreateIndex
CREATE INDEX "case_documents_caseId_idx" ON "case_documents"("caseId");

-- CreateIndex
CREATE INDEX "case_documents_caseId_typeId_idx" ON "case_documents"("caseId", "typeId");

-- CreateIndex
CREATE INDEX "case_documents_status_idx" ON "case_documents"("status");

-- CreateIndex
CREATE INDEX "document_files_documentId_idx" ON "document_files"("documentId");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
