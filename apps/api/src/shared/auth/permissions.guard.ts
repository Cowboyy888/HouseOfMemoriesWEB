import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PrismaService } from "../database/prisma.service";
import { PERMISSIONS_KEY } from "./require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.authSession?.user;
    if (!user) {
      throw new UnauthorizedException("Sign in required");
    }

    const assignments = await this.prisma.client.userRole.findMany({
      where: { userId: user.id },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: { select: { resource: true, action: true } } },
            },
          },
        },
      },
    });

    const granted = new Set(
      assignments.flatMap((assignment) =>
        assignment.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
      ),
    );

    const hasAll = required.every((permission) => granted.has(permission));
    if (!hasAll) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
