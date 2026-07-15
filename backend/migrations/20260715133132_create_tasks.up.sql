-- create table tasks
CREATE TABLE "tasks" (
  "id" text PRIMARY KEY,
  "created_at" timestamptz NOT NULL,
  "note" text NOT NULL,
  "project_id" text NOT NULL,
  "status" text NOT NULL,
  "title" text NOT NULL
);
