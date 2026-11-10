import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { assertDatabaseEnvironment } from "@/lib/db/config";
import { logDatabaseError } from "@/lib/db/errors";

class DatabaseSignInError extends CredentialsSignin {
  code = "database_unavailable";
}

class InactiveAccountError extends CredentialsSignin {
  code = "account_inactive";
}

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

        try {
          assertDatabaseEnvironment();
          const email = parsed.data.email.toLowerCase();
          const account = await prisma.account.findUnique({ where: { email } });
          const passwordMatches = await verifyPassword(parsed.data.password, account?.passwordHash);
          if (!account || !passwordMatches) return null;
          if (!account.active) throw new InactiveAccountError();
          await prisma.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
          return { id: account.id, name: account.name, email: account.email };
        } catch (error) {
          if (error instanceof InactiveAccountError) throw error;
          logDatabaseError(error, "로그인");
          throw new DatabaseSignInError();
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: { authorized: () => true },
  logger: { error(error) { logDatabaseError(error, "인증"); } },
});
