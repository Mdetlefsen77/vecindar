import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      loteId: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    loteId: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    loteId: number;
  }
}
