-- @owned 導入に伴う既存行の backfill + owner 絞り込み用インデックス(手書き)。
-- 単一テナント時代に作られた行は所有者未設定(NULL)。オーナーのメールに帰属させる。
-- ここは環境依存の値なので手書き(migration-gen は生成しない)。
UPDATE "projects"  SET "owner_email" = 'kento.yamamoto@nxtend.or.jp' WHERE "owner_email" IS NULL;
UPDATE "work_logs" SET "owner_email" = 'kento.yamamoto@nxtend.or.jp' WHERE "owner_email" IS NULL;
UPDATE "tasks"     SET "owner_email" = 'kento.yamamoto@nxtend.or.jp' WHERE "owner_email" IS NULL;

CREATE INDEX IF NOT EXISTS "ix_projects_owner_email"  ON "projects"  ("owner_email");
CREATE INDEX IF NOT EXISTS "ix_work_logs_owner_email" ON "work_logs" ("owner_email");
CREATE INDEX IF NOT EXISTS "ix_tasks_owner_email"     ON "tasks"     ("owner_email");
