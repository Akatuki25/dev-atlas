-- create table work_logs
CREATE TABLE "work_logs" (
  "id" text PRIMARY KEY,
  "created_at" timestamptz NOT NULL,
  "minutes" integer NOT NULL,
  "project_id" text NOT NULL,
  "source" text NOT NULL,
  "summary" text NOT NULL
);
