// 手書き: wiki トップ。KB の INDEX.md(地図)をそのまま入口として描画する。
import { kbAvailable, readPage } from "../../lib/kb";
import { WikiArticle } from "./article";

export const dynamic = "force-dynamic"; // KB はマウントされた実ファイルを毎回読む

export default function WikiIndex() {
  if (!kbAvailable()) {
    return (
      <main style={{ maxWidth: 860, margin: "2rem auto", fontFamily: "system-ui" }}>
        <h1>Wiki</h1>
        <p>
          KB がマウントされていません。<code>KB_PATH</code>(既定 <code>/kb</code>)に
          knowledge_base ディレクトリをマウントしてください(README 参照)。
        </p>
      </main>
    );
  }
  const page = readPage("INDEX.md");
  if (!page) {
    return (
      <main style={{ maxWidth: 860, margin: "2rem auto", fontFamily: "system-ui" }}>
        <h1>Wiki</h1>
        <p>KB に INDEX.md が見つかりません。</p>
      </main>
    );
  }
  return <WikiArticle page={page} />;
}
