import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import type { PrismaService } from "../database/prisma.service";

function makeContext(user: { id: string } | null = null): ExecutionContext {
  const request = { authSession: user ? { user } : undefined };
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeReflector(required: string[] | undefined): Reflector {
  return { getAllAndOverride: vi.fn().mockReturnValue(required) } as unknown as Reflector;
}

function makePrisma(granted: Array<{ resource: string; action: string }>): PrismaService {
  return {
    client: {
      userRole: {
        findMany: vi.fn().mockResolvedValue([{ role: { permissions: granted.map((permission) => ({ permission })) } }]),
      },
    },
  } as unknown as PrismaService;
}

describe("PermissionsGuard", () => {
  it("allows the request when the route has no @RequirePermissions metadata at all (fail-open for intentionally public routes)", async () => {
    const prisma = makePrisma([]);
    const guard = new PermissionsGuard(makeReflector(undefined), prisma);

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(prisma.client.userRole.findMany).not.toHaveBeenCalled();
  });

  it("allows the request when @RequirePermissions was called with zero permissions", async () => {
    const guard = new PermissionsGuard(makeReflector([]), makePrisma([]));

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it("throws UnauthorizedException when the route requires permissions but there's no session at all", async () => {
    const guard = new PermissionsGuard(makeReflector(["report:view"]), makePrisma([]));

    await expect(guard.canActivate(makeContext(null))).rejects.toThrow(UnauthorizedException);
  });

  it("throws ForbiddenException when the signed-in user is missing a required permission", async () => {
    const guard = new PermissionsGuard(
      makeReflector(["report:view"]),
      makePrisma([{ resource: "booking", action: "view" }]),
    );

    await expect(guard.canActivate(makeContext({ id: "user-1" }))).rejects.toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when the user has some but not all of several required permissions", async () => {
    const guard = new PermissionsGuard(
      makeReflector(["report:view", "booking:manage"]),
      makePrisma([{ resource: "report", action: "view" }]),
    );

    await expect(guard.canActivate(makeContext({ id: "user-1" }))).rejects.toThrow(ForbiddenException);
  });

  it("allows the request when the signed-in user holds every required permission, aggregated across roles", async () => {
    const guard = new PermissionsGuard(
      makeReflector(["report:view", "booking:manage"]),
      makePrisma([
        { resource: "report", action: "view" },
        { resource: "booking", action: "manage" },
      ]),
    );

    await expect(guard.canActivate(makeContext({ id: "user-1" }))).resolves.toBe(true);
  });
});
