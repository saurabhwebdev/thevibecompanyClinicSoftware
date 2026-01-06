import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dbConnect from "./db/mongoose";
import { User, Role, Tenant } from "@/models";
import {
  sanitizeString,
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
} from "./security";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      avatarStyle: string;
      avatarSeed: string;
      role: {
        id: string;
        name: string;
        permissions: Array<{
          resource: string;
          actions: string[];
        }>;
      };
      tenant: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    roleId: string;
    tenantId: string;
    avatarStyle?: string;
    avatarSeed?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleId: string;
    tenantId: string;
    avatarStyle?: string;
    avatarSeed?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Sanitize inputs to prevent injection
        const email = sanitizeString(credentials.email, 254).toLowerCase();
        const tenantSlug = sanitizeString(credentials.tenantSlug, 100).toLowerCase();

        // Check account lockout
        const lockoutKey = `${email}:${tenantSlug}`;
        const lockout = checkAccountLockout(lockoutKey);
        if (lockout.locked) {
          const minutesLeft = Math.ceil((lockout.lockoutUntil! - Date.now()) / 60000);
          throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
        }

        await dbConnect();

        // Find tenant by slug
        const tenant = await Tenant.findOne({
          slug: tenantSlug,
          isActive: true
        });

        if (!tenant) {
          recordFailedAttempt(lockoutKey);
          throw new Error("Invalid credentials");
        }

        // Find user by email and tenant
        const user = await User.findOne({
          email: email,
          tenantId: tenant._id,
          isActive: true,
        });

        if (!user) {
          recordFailedAttempt(lockoutKey);
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          recordFailedAttempt(lockoutKey);
          throw new Error("Invalid credentials");
        }

        // Clear failed attempts on successful login
        clearFailedAttempts(lockoutKey);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          roleId: user.roleId.toString(),
          tenantId: user.tenantId.toString(),
          avatarStyle: user.avatarStyle || "adventurer",
          avatarSeed: user.avatarSeed || user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.roleId = user.roleId;
        token.tenantId = user.tenantId;
        token.avatarStyle = user.avatarStyle;
        token.avatarSeed = user.avatarSeed;
      }

      // Refresh avatar data on session update
      if (trigger === "update") {
        await dbConnect();
        const dbUser = await User.findById(token.id).select("avatarStyle avatarSeed email");
        if (dbUser) {
          token.avatarStyle = dbUser.avatarStyle || "adventurer";
          token.avatarSeed = dbUser.avatarSeed || dbUser.email || "user";
        }
      }

      return token;
    },
    async session({ session, token }) {
      await dbConnect();

      const role = await Role.findById(token.roleId);
      const tenant = await Tenant.findById(token.tenantId);

      // If role or tenant not found, the session is invalid
      // Return a minimal session that will trigger re-authentication
      if (!role || !tenant) {
        return session;
      }

      // Fetch fresh avatar data using native MongoDB to bypass any caching
      let avatarStyle = "adventurer";
      let avatarSeed = session.user.email;

      try {
        const db = mongoose.connection.db;
        if (db) {
          const usersCollection = db.collection("users");
          const objectId = new mongoose.Types.ObjectId(token.id);
          const dbUser = await usersCollection.findOne(
            { _id: objectId },
            { projection: { avatarStyle: 1, avatarSeed: 1 } }
          );
          if (dbUser?.avatarStyle) avatarStyle = dbUser.avatarStyle;
          if (dbUser?.avatarSeed) avatarSeed = dbUser.avatarSeed;
        }
      } catch {
        // Silently handle error, use defaults
      }

      session.user = {
        id: token.id,
        name: session.user.name,
        email: session.user.email,
        avatarStyle: avatarStyle,
        avatarSeed: avatarSeed,
        role: {
          id: role._id.toString(),
          name: role.name,
          permissions: role.permissions.map((p) => ({
            resource: p.resource,
            actions: p.actions,
          })),
        },
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
        },
      };

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
