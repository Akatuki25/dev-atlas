// 手書き: KB refresh(CI の GitHub Actions が push 時に叩く)。KB_REFRESH_TOKEN で保護、read-only 同期。
// KB_PATH の clone を git pull する。未設定/非git(ローカルmount)なら no-op を返す。
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.KB_REFRESH_TOKEN;
  if (!expected) return NextResponse.json({ detail: "kb-refresh disabled" }, { status: 404 });
  if (req.headers.get("x-refresh-token") !== expected) {
    return NextResponse.json({ detail: "invalid refresh token" }, { status: 401 });
  }
  const kbPath = process.env.KB_PATH ?? "/kb";
  if (!existsSync(join(kbPath, ".git"))) {
    return NextResponse.json({ status: "skipped", reason: "not a git clone (mounted?)" });
  }
  try {
    const { stdout } = await pexec("git", ["-C", kbPath, "pull", "--ff-only"], { timeout: 30_000 });
    return NextResponse.json({ status: "ok", git: stdout.trim().slice(0, 200) });
  } catch (e) {
    return NextResponse.json({ detail: String((e as Error).message).slice(0, 300) }, { status: 500 });
  }
}
