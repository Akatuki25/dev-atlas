-- create table user_settings
CREATE TABLE "user_settings" (
  "email" text PRIMARY KEY,
  "created_at" timestamptz,
  "github_pat_enc" text,
  "kb_branch" text,
  "kb_repo" text NOT NULL,
  "mcp_token" text,
  "owner_email" text
);
