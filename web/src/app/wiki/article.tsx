// 手書き: wiki 記事の共通描画。frontmatter をチップ表示し、本文を Markdown レンダリング。
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { KbPage } from "../../lib/kb";

const CHIP_KEYS = ["type", "status", "confidence", "category"] as const;

export function WikiArticle({ page }: { page: KbPage }) {
  return (
    <main style={{ maxWidth: 860, margin: "2rem auto", padding: "0 16px", fontFamily: "system-ui", lineHeight: 1.7 }}>
      <div style={{ fontSize: 12, color: "#888" }}>
        <Link href="/wiki" style={{ color: "#888" }}>Wiki</Link> / {page.relPath}
      </div>
      <h1 style={{ marginBottom: 4 }}>{page.title}</h1>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {CHIP_KEYS.filter((k) => page.frontmatter[k]).map((k) => (
          <span key={k} style={{ fontSize: 11, background: "#f0f0f0", borderRadius: 10, padding: "2px 8px", color: "#555" }}>
            {k}: {page.frontmatter[k].replace(/[\[\]"]/g, "")}
          </span>
        ))}
      </div>
      <article className="wiki-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) =>
              href?.startsWith("/") ? (
                <Link href={href}>{children}</Link>
              ) : (
                <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  {children}
                </a>
              ),
            table: ({ children }) => (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse" }}>{children}</table>
              </div>
            ),
            th: ({ children }) => <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#fafafa", textAlign: "left" }}>{children}</th>,
            td: ({ children }) => <td style={{ border: "1px solid #ddd", padding: "4px 8px" }}>{children}</td>,
            code: ({ children, className }) =>
              className ? (
                <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 6, overflowX: "auto" }}>
                  <code>{children}</code>
                </pre>
              ) : (
                <code style={{ background: "#f2f2f2", borderRadius: 4, padding: "1px 5px", fontSize: "0.9em" }}>{children}</code>
              ),
          }}
        >
          {page.body}
        </ReactMarkdown>
      </article>
    </main>
  );
}
