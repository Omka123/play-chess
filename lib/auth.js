import GoogleProvider from "next-auth/providers/google";
import { ensureGoogleUser } from "./users";

export const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: googleAuthEnabled ? [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: { params: { scope: "openid email profile" } },
  })] : [],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider === "google" && profile?.email_verified === true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile) {
        const user = await ensureGoogleUser(profile);
        token.userId = user.id;
        token.name = user.name;
        token.picture = user.image;
        token.createdAt = user.createdAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.createdAt = token.createdAt;
      }
      return session;
    },
  },
};
