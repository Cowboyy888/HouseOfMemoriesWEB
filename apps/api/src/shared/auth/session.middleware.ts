import { Injectable, NestMiddleware } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../../modules/auth/auth";

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

declare module "express-serve-static-core" {
  interface Request {
    authSession?: AuthSession;
  }
}

/**
 * Attaches the Better Auth session (if any) to every request without
 * blocking unauthenticated ones — PermissionsGuard is what actually decides
 * whether a route requires it.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    req.authSession = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    next();
  }
}
