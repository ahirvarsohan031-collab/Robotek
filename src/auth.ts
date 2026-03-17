import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await getUserByUsernameOrEmail(credentials.username as string);

        if (user && user.password === credentials.password) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        // @ts-ignore
        session.user.username = token.username;
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.image = token.image_url;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // @ts-ignore
        token.username = user.username;
        // @ts-ignore
        token.role = (user as any).role_name;
        // @ts-ignore
        token.image_url = (user as any).image_url;
      }
      return token;
    },
  },
});
