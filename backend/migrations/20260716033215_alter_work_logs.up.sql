-- alter table work_logs
ALTER TABLE "work_logs" ADD COLUMN "detail" text;
ALTER TABLE "work_logs" ALTER COLUMN "minutes" DROP NOT NULL;
ALTER TABLE "work_logs" ALTER COLUMN "source" DROP NOT NULL;
ALTER TABLE "work_logs" ALTER COLUMN "created_at" DROP NOT NULL;
