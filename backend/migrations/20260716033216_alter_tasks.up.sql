-- alter table tasks
ALTER TABLE "tasks" ALTER COLUMN "note" DROP NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "created_at" DROP NOT NULL;
