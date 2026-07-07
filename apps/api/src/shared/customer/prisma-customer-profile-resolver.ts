import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { CustomerProfileResolver, ResolvedCustomerProfile } from "./customer-profile-resolver";

@Injectable()
export class PrismaCustomerProfileResolver implements CustomerProfileResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveByUserId(userId: string): Promise<ResolvedCustomerProfile | null> {
    const profile = await this.prisma.client.customerProfile.findUnique({
      where: { userId },
      select: { id: true, user: { select: { email: true } } },
    });
    return profile ? { id: profile.id, email: profile.user.email } : null;
  }
}
