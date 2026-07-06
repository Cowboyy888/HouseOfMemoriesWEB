import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

/** Permission strings are `resource:action` pairs, e.g. "report:view" — see
 * the Permission model in packages/database/prisma/schema/identity.prisma. */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
