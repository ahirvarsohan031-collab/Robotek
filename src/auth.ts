import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
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
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        // @ts-ignore
        session.user.username = token.username;
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.image = token.image_url;
        // @ts-ignore
        session.user.permissions = token.permissions;
      }
      return session;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.sub = user.id;
        // @ts-ignore
        token.username = user.username;
        // @ts-ignore
        token.name = user.username; // Map username to name for NextAuth
        // @ts-ignore
        token.role = (user as any).role_name;
        // @ts-ignore
        token.image_url = (user as any).image_url;
        // @ts-ignore
        token.permissions = (user as any).permissions;
      }
      return token;
    },
  },
});
