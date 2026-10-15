import GoogleProvider from "next-auth/providers/google";
import { ensureGoogleUser } from "./users";
import { registerPlayer } from "./community";

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
    async jwt({ token, account, profile, trigger }) {
      if (account?.provider === "google" && profile) {
        const user = await ensureGoogleUser(profile);
        token.userId = user.id;
        const player = await registerPlayer(user);
        token.name = player.name;
        token.picture = user.image;
        token.createdAt = user.createdAt;
      }
      if (trigger === "update" && token.userId) token.name = (await registerPlayer({ id: token.userId })).name;
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
