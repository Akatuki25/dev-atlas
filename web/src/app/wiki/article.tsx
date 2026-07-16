// 手書き: wiki 記事の描画。大きいタイトル + frontmatter を目立たせ、本文を読みやすい幅で Markdown 描画。
// 色はすべて tokens(ダークモード追従)。
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { KbPage } from "../../lib/kb";
import { Badge, type Tone } from "../../lib/widgets";

const STATUS_TONE: Record<string, Tone> = { verified: "ok", draft: "warn", stub: "neutral" };

function category(relPath: string): string {
  const parts = relPath.split("/");
  const wi = parts.indexOf("wiki");
  return wi >= 0 ? parts[wi + 1] ?? "" : "";
}

export function WikiArticle({ page }: { page: KbPage }) {
  const fm = page.frontmatter;
  const clean = (s?: string) => (s ?? "").replace(/[[\]"]/g, "");
  return (
    <article style={{ maxWidth: 820, padding: "var(--sp-6)", lineHeight: 1.75 }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--sp-2)" }}>
        <Link href="/wiki" style={{ color: "var(--text-faint)" }}>Wiki</Link>
        {category(page.relPath) && <> / {category(page.relPath)}</>}
      </div>
      <h1 style={{ margin: 0, fontSize: "var(--text-3xl)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{page.title}</h1>
      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap", margin: "var(--sp-3) 0 var(--sp-5)" }}>
        {fm.type && <Badge tone="accent">{clean(fm.type)}</Badge>}
        {fm.status && <Badge tone={STATUS_TONE[clean(fm.status)] ?? "neutral"}>{clean(fm.status)}</Badge>}
        {fm.confidence && <Badge tone="neutral">confidence: {clean(fm.confidence)}</Badge>}
      </div>
      <div className="wiki-body" style={{ fontSize: "var(--text-md)", color: "var(--text)" }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) =>
              href?.startsWith("/") ? (
                <Link href={href} style={{ color: "var(--accent)" }}>{children}</Link>
              ) : (
                <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={{ color: "var(--accent)" }}>
                  {children}
                </a>
              ),
            table: ({ children }) => (
              <div style={{ overflowX: "auto", margin: "var(--sp-3) 0" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>{children}</table>
              </div>
            ),
            th: ({ children }) => <th style={{ border: "1px solid var(--border)", padding: "var(--sp-1) var(--sp-2)", background: "var(--surface-2)", textAlign: "left" }}>{children}</th>,
            td: ({ children }) => <td style={{ border: "1px solid var(--border)", padding: "var(--sp-1) var(--sp-2)" }}>{children}</td>,
            code: ({ children, className }) =>
              className ? (
                <pre style={{ background: "var(--surface-2)", border: "1px solid var(--border)", padding: "var(--sp-3)", borderRadius: "var(--radius-sm)", overflowX: "auto", fontSize: "var(--text-sm)" }}>
                  <code>{children}</code>
                </pre>
              ) : (
                <code style={{ background: "var(--surface-2)", borderRadius: "var(--radius-sm)", padding: "1px 5px", fontSize: "0.9em", fontFamily: "var(--font-mono)" }}>{children}</code>
              ),
            blockquote: ({ children }) => (
              <blockquote style={{ borderLeft: "3px solid var(--border-strong)", margin: "var(--sp-3) 0", paddingLeft: "var(--sp-3)", color: "var(--text-muted)" }}>{children}</blockquote>
            ),
          }}
        >
          {page.body}
        </ReactMarkdown>
      </div>
    </article>
  );
}
