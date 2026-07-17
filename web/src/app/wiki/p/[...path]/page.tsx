// 手書き: wiki 記事ページ(KB 相対パス指定)。例: /wiki/p/principles/right-sized-design.md
import { notFound } from "next/navigation";
import { readPage } from "../../../../lib/kb";
import { WikiArticle } from "../../article";

export const dynamic = "force-dynamic";

export default async function WikiPage({ params }: { params: { path: string[] } }) {
  const rel = params.path.map(decodeURIComponent).join("/");
  const page = await readPage(rel.endsWith(".md") ? rel : rel + ".md");
  if (!page) notFound();
  return <WikiArticle page={page} />;
}
