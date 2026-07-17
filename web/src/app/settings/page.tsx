// 手書き: ユーザー設定。自分の KB(GitHub PAT + repo/branch)と MCP トークンを管理する。
// PAT は backend で暗号化保存 → ここには生値を返さない(設定済みかだけ表示)。
"use client";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Page, Section, Field, Button, KVList, ErrorText } from "../../lib/widgets";

type SettingsDTO = {
  email: string;
  github_pat_enc: string; // "set" | "" (マスク済み)
  kb_repo: string;
  kb_branch: string;
  mcp_token: string;
  created_at_unix: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function SettingsPage() {
  const [current, setCurrent] = useState<SettingsDTO | null>(null);
  const [pat, setPat] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    apiFetch<SettingsDTO>("/api/settings", { method: "GET" })
      .then((s) => {
        setCurrent(s);
        setRepo(s.kb_repo ?? "");
        setBranch(s.kb_branch || "main");
      })
      .catch(() => setCurrent(null)) // 404 = 未設定
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => load(), [load]);

  const save = async () => {
    setErr("");
    setMsg("");
    if (!repo.trim()) {
      setErr("KB リポジトリ(owner/name)は必須です");
      return;
    }
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: { github_pat: pat, kb_repo: repo.trim(), kb_branch: branch.trim() || "main" },
      });
      setPat("");
      setMsg("保存しました");
      load();
    } catch {
      setErr("保存に失敗しました");
    }
  };

  const patState = current?.github_pat_enc === "set" ? "設定済み(保持中)" : "未設定";
  const mcpCmd = current?.mcp_token
    ? `claude mcp add --transport http dev-atlas ${API_BASE}/mcp --header "Authorization: Bearer ${current.mcp_token}"`
    : "";

  return (
    <Page
      title="Settings"
      description="自分の KB 接続(GitHub PAT + リポジトリ)と MCP トークンを管理します。PAT は暗号化して保存され、画面には返しません。"
    >
      <Section title="KB 接続">
        <div style={{ display: "grid", gap: "var(--sp-3)", maxWidth: 560 }}>
          <Field
            label={`GitHub PAT(fine-grained, Contents:Read / 現在: ${patState})`}
            type="text"
            value={pat}
            onChange={setPat}
          />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
            設定済みなら空欄のまま保存すると既存 PAT を保持します(repo/branch だけ変更可)。
          </p>
          <Field label="KB リポジトリ(owner/name)" type="text" value={repo} onChange={setRepo} />
          <Field label="ブランチ" type="text" value={branch} onChange={setBranch} />
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
            <Button type="button" onClick={save}>保存</Button>
            {msg && <span style={{ fontSize: "var(--text-sm)", color: "var(--ok, var(--accent))" }}>{msg}</span>}
            {err && <ErrorText>{err}</ErrorText>}
          </div>
        </div>
      </Section>

      {loaded && current && (
        <Section title="MCP 登録">
          <KVList
            items={[
              { k: "状態", v: patState },
              { k: "リポジトリ", v: current.kb_repo || "—" },
              {
                k: "登録コマンド",
                v: (
                  <code style={{ fontSize: "var(--text-sm)", wordBreak: "break-all", userSelect: "all" }}>
                    {mcpCmd}
                  </code>
                ),
              },
            ]}
          />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            このトークンはあなた専用です。Claude Code に登録すると、MCP から操作した進捗・工数・KB 検索が
            あなたのアカウントに紐づきます。
          </p>
        </Section>
      )}
    </Page>
  );
}
