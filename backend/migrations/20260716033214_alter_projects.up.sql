-- alter table projects
ALTER TABLE "projects" ALTER COLUMN "goal" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "progress" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repo_url" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "kb_node" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "created_at" DROP NOT NULL;
