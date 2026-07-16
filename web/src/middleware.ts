// 手書き: ページ側の認証ゲート(Next middleware)。生成ページには一切触れず全ルートを横断保護する
// = backend の WebAuthMiddleware と同じ「seam でのみ守る」構え。
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== "1") return NextResponse.next();
  const token = await getToken({ req });
  if (token) return NextResponse.next();
  const signIn = new URL("/api/auth/signin", req.url);
  signIn.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  // 認証自身のルートと静的アセットは除外
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
