import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "md-ai-agent-local-development-only-secret" : undefined),
  providers: [
    Credentials({
      credentials: { email: {}, password: { type: "password" } },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const account = await prisma.account.findUnique({ where: { email } });
        const passwordMatches = await verifyPassword(parsed.data.password, account?.passwordHash);
        if (!account || !passwordMatches) return null;

        return { id: account.id, name: account.name, email: account.email };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: { authorized: () => true },
});