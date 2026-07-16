// 手書き: API ベース。生成された client がこれを使う(= 横断関心を差し込む唯一の seam)。
// - NEXT_PUBLIC_API_BASE: 接続先(Dockerfile の build arg で差し替え)
// - NEXT_PUBLIC_AUTH_ENABLED=1: NextAuth セッションの backendToken を Bearer 付与
//   (シグネチャは不変なので生成 client には一切影響しない)
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

let cachedToken: { token: string; exp: number } | null = null;

function decodeExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

/** セッションの backend トークンを取得(有効期限まで再利用)。auth 無効時は null。 */
async function backendToken(): Promise<string | null> {
  if (!AUTH_ENABLED || typeof window === "undefined") return null;
  const now = Date.now() / 1000;
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const token = session?.backendToken ?? null;
  if (!token) return null;
  cachedToken = { token, exp: decodeExp(token) };
  return token;
}

export async function apiFetch<T>(path: string, opts: { method: string; body?: unknown }): Promise<T> {
  const token = await backendToken();
  const headers: Record<string, string> = {
    ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(BASE + path, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error("API error " + res.status);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
