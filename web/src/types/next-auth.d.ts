import "next-auth";

declare module "next-auth" {
  interface Session {
    /** backend(FastAPI)検証用の短命JWT。lib/api.ts が Authorization に付与する */
    backendToken?: string;
  }
}
