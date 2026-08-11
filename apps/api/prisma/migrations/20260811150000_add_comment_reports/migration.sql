CREATE TYPE "CommentReportReason" AS ENUM (
  'SPAM',
  'HARASSMENT',
  'HATEFUL',
  'MISINFORMATION',
  'OTHER'
);

CREATE TABLE "VideoCommentReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "commentId" UUID NOT NULL,
  "reporterId" UUID NOT NULL,
  "reason" "CommentReportReason" NOT NULL,
  "details" VARCHAR(500),
  "resolvedAt" TIMESTAMPTZ(3),
  "resolvedById" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VideoCommentReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoCommentReport_commentId_reporterId_key"
ON "VideoCommentReport"("commentId", "reporterId");

CREATE INDEX "VideoCommentReport_commentId_resolvedAt_idx"
ON "VideoCommentReport"("commentId", "resolvedAt");

CREATE INDEX "VideoCommentReport_reporterId_createdAt_idx"
ON "VideoCommentReport"("reporterId", "createdAt");

CREATE INDEX "VideoCommentReport_resolvedById_resolvedAt_idx"
ON "VideoCommentReport"("resolvedById", "resolvedAt");

ALTER TABLE "VideoCommentReport"
ADD CONSTRAINT "VideoCommentReport_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "VideoComment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoCommentReport"
ADD CONSTRAINT "VideoCommentReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoCommentReport"
ADD CONSTRAINT "VideoCommentReport_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
