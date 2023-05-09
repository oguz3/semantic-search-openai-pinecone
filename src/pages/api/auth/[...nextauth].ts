import NextAuth, { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "../../../server/db/client";
import { hashPassword, verifyPassword } from "../../../utils/auth";
import { env } from "../../../env/server.mjs";

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token?.sub || "",
          ...session.user,
        },
      };
    },
  },
  // Configure one or more authentication providers
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    // ...add more providers here
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email Address",
          type: "email",
          placeholder: "john.doe@example.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Your super secure password",
        },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.password || !credentials?.email) {
            throw new Error("Invalid Credentials");
          }

          console.log("@@@@@@", credentials?.email, credentials?.password);
          let maybeUser = await prisma.user.findFirst({
            where: {
              email: credentials?.email,
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
            },
          });

          console.log("@@@@ MaybeUser", maybeUser);

          if (!maybeUser) {
            maybeUser = await prisma.user.create({
              data: {
                email: credentials.email,
                password: await hashPassword(credentials?.password),
              },
              select: {
                id: true,
                email: true,
                password: true,
                name: true,
              },
            });
          } else {
            const isValid = await verifyPassword(
              credentials?.password,
              maybeUser?.password || ""
            );

            if (!isValid) {
              throw new Error("Invalid Credentials");
            }
          }

          console.log("!@@@@ MaybeUser last", maybeUser);

          return {
            id: maybeUser.id,
            email: maybeUser.email,
          };
        } catch (error) {
          console.log(error);
          throw error;
        }
      },
    }),
  ],
};

export default NextAuth(authOptions);
