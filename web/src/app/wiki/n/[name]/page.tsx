// 手書き: [[wikilink]] の名前解決ページ。名前 → KB 相対パスに解決してリダイレクト。
import { notFound, redirect } from "next/navigation";
import { resolveName } from "../../../../lib/kb";

export const dynamic = "force-dynamic";

export default function WikiName({ params }: { params: { name: string } }) {
  const rel = resolveName(decodeURIComponent(params.name));
  if (!rel) notFound();
  redirect("/wiki/p/" + rel.split("/").map(encodeURIComponent).join("/"));
}
