import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import type { CustomerContactResolver } from "../domain/customer-contact-resolver";

@Injectable()
export class PrismaCustomerContactResolver implements CustomerContactResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveEmail(customerId: string): Promise<string | null> {
    const profile = await this.prisma.client.customerProfile.findUnique({
      where: { id: customerId },
      select: { user: { select: { email: true } } },
    });
    return profile?.user.email ?? null;
  }
}
