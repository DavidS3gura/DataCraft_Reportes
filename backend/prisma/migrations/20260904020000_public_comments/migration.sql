-- Adds isPublic flag so admin comments can be visible to the reporter.
ALTER TABLE "ReportComment" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
