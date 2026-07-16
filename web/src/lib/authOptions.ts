// 手書き: NextAuth 設定(hackathon-support-agent の実績構成を単一ユーザー向けに簡素化)。
// Google でログイン → ALLOWED_EMAILS で本人だけ許可 → backend 検証用の短命JWT(HS256,
// NEXTAUTH_SECRET 共有鍵)を session に載せる。backend は同じ鍵で検証する(middleware/web_auth.py)。
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SignJWT } from "jose";

async function mintBackendToken(email: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const allowed = (process.env.ALLOWED_EMAILS ?? "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      if (allowed.length === 0) return true; // 未設定なら制限しない(ローカル)
      return !!user.email && allowed.includes(user.email);
    },
    async session({ session }) {
      if (session.user?.email) {
        session.backendToken = await mintBackendToken(session.user.email);
      }
      return session;
    },
  },
};
