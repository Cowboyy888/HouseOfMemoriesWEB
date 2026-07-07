import { Global, Module } from "@nestjs/common";
import { CUSTOMER_PROFILE_RESOLVER } from "./customer-profile-resolver";
import { PrismaCustomerProfileResolver } from "./prisma-customer-profile-resolver";

@Global()
@Module({
  providers: [{ provide: CUSTOMER_PROFILE_RESOLVER, useClass: PrismaCustomerProfileResolver }],
  exports: [CUSTOMER_PROFILE_RESOLVER],
})
export class CustomerModule {}
