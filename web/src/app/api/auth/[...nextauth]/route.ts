// 手書き: NextAuth ルート(認証系は生成対象外の seam)。
import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
