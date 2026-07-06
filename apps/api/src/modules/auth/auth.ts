import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createPrismaClient } from "@drivehub/database";
import { getAllowedOrigins } from "../../shared/config/allowed-origins";

const prisma = createPrismaClient();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

/**
 * Signing up creates the Better Auth User row only. The rest of the domain
 * (Booking, Reviews, Loyalty, ...) hangs off CustomerProfile, not User, per
 * the DDD bounded-context split in the Sprint 2 schema — so a brand new
 * user isn't a real "customer" yet until this hook backfills that profile
 * and the CUSTOMER role, mirroring what prisma/seed.ts does for demo data.
 */
async function provisionCustomer(user: { id: string }): Promise<void> {
  const customerRole = await prisma.role.upsert({
    where: { name: "CUSTOMER" },
    update: {},
    create: { name: "CUSTOMER", description: "Rental/sales customer", isSystem: true },
  });

  await prisma.customerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: customerRole.id } },
    update: {},
    create: { userId: user.id, roleId: customerRole.id },
  });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  basePath: "/api/auth",
  trustedOrigins: getAllowedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {}),
    ...(facebookClientId && facebookClientSecret
      ? { facebook: { clientId: facebookClientId, clientSecret: facebookClientSecret } }
      : {}),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await provisionCustomer(user);
        },
      },
    },
  },
});
