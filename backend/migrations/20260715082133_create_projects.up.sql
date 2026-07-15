-- create table projects
CREATE TABLE "projects" (
  "id" text PRIMARY KEY,
  "created_at" timestamptz NOT NULL,
  "goal" text NOT NULL,
  "kb_node" text NOT NULL,
  "name" text NOT NULL,
  "progress" integer NOT NULL,
  "repo_url" text NOT NULL,
  "status" text NOT NULL
);
