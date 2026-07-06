import { createAuthClient } from "better-auth/react";
import { env } from "./env";

// Same Better Auth server as apps/web — one user/session system, staff and
// customers alike; role/permission checks (not a separate auth backend) are
// what gate access to this app's data.
export const authClient = createAuthClient({
  baseURL: env.apiOrigin,
});

export const { signIn, signOut, useSession } = authClient;
