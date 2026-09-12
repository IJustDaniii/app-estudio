import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validation";
import { allowLoginAttempt, clearLoginAttempts } from "@/lib/security/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success || !allowLoginAttempt(parsed.data.email)) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !(await compare(parsed.data.password, user.passwordHash))) return null;

        clearLoginAttempts(parsed.data.email);
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
});

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
