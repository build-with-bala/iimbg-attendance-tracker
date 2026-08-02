import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const ALLOWED_HD = (process.env.ALLOWED_HD || "iimbg.ac.in").toLowerCase();
const DEMO = process.env.DEMO_MODE === "true";

export function isAdmin(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

const providers: any[] = [];

if (process.env.GOOGLE_CLIENT_ID) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { hd: ALLOWED_HD, prompt: "select_account" } },
    })
  );
}

// Demo bypass: lets you use the app before Google OAuth is wired.
// "admin" -> admin role; any *@iimbg.ac.in email -> student role.
if (DEMO) {
  providers.push(
    Credentials({
      name: "Demo",
      credentials: { email: { label: "Email" } },
      authorize: async (c) => {
        const email = String(c?.email || "").toLowerCase();
        if (email === "admin")
          return { id: "demo-admin", name: "Demo Admin", email: (ADMIN_EMAILS[0] || "admin@iimbg.ac.in") };
        if (email.endsWith("@" + ALLOWED_HD))
          return { id: "demo-" + email, name: email.split("@")[0], email };
        return null;
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        const hd = (profile as any)?.hd?.toLowerCase();
        const email = (profile?.email || "").toLowerCase();
        return hd === ALLOWED_HD || email.endsWith("@" + ALLOWED_HD);
      }
      return !!user;
    },
    async jwt({ token }) {
      token.role = isAdmin(token.email as string) ? "admin" : "student";
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role || "student";
      return session;
    },
  },
  pages: { signIn: "/login" },
});
