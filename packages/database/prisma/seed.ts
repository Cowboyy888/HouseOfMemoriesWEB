import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ---- RBAC ----
  const [adminRole, customerRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN", description: "Full platform access", isSystem: true },
    }),
    prisma.role.upsert({
      where: { name: "CUSTOMER" },
      update: {},
      create: { name: "CUSTOMER", description: "Rental/sales customer", isSystem: true },
    }),
  ]);

  const permissionDefs: Array<[string, string]> = [
    ["booking", "create"],
    ["booking", "read"],
    ["booking", "update"],
    ["booking", "cancel"],
    ["car", "manage"],
    ["employee", "manage"],
    ["report", "view"],
    ["payment", "create"],
    ["payment", "read"],
    ["payment", "refund"],
    ["payment", "update"],
    ["invoice", "read"],
    ["notification", "read"],
  ];

  const permissions = await Promise.all(
    permissionDefs.map(([resource, action]) =>
      prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      }),
    ),
  );

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      }),
    ),
  );

  // Customers create/read/cancel their own bookings and payments (ownership
  // enforced at the use-case level, not by these permissions alone).
  const customerPermissionNames = [
    "payment:create",
    "payment:read",
    "booking:create",
    "booking:read",
    "booking:cancel",
    "invoice:read",
    "notification:read",
  ];
  await Promise.all(
    permissions
      .filter((permission) => customerPermissionNames.includes(`${permission.resource}:${permission.action}`))
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: customerRole.id, permissionId: permission.id } },
          update: {},
          create: { roleId: customerRole.id, permissionId: permission.id },
        }),
      ),
  );

  // ---- Admin Dashboard personas (Sprint 5) ----
  // Distinct from the generic ADMIN/EMPLOYEE roles above, which predate the
  // dashboard's role list — kept for backward compatibility rather than
  // removed, since real UserRole rows already reference them.
  const dashboardRoleDefs = [
    ["SUPER_ADMIN", "Full platform access across all branches"],
    ["COMPANY_OWNER", "Company-wide visibility, strategic oversight"],
    ["BRANCH_MANAGER", "Operational oversight of a single branch"],
    ["FLEET_MANAGER", "Fleet, maintenance, and vehicle inventory management"],
    ["SALES_MANAGER", "Sales pipeline, quotations, and contracts"],
    ["HR_MANAGER", "Employee records, attendance, payroll"],
    ["FINANCE_MANAGER", "Revenue, invoices, refunds, financial reporting"],
    ["CUSTOMER_SUPPORT", "Booking and customer-facing support tasks"],
    ["STAFF", "Baseline branch staff access"],
  ] as const;

  const dashboardRoles = Object.fromEntries(
    await Promise.all(
      dashboardRoleDefs.map(async ([name, description]) => [
        name,
        await prisma.role.upsert({
          where: { name },
          update: {},
          create: { name, description, isSystem: true },
        }),
      ]),
    ),
  ) as Record<(typeof dashboardRoleDefs)[number][0], { id: string }>;

  const reportViewPermission = permissions.find((p) => p.resource === "report" && p.action === "view");
  if (!reportViewPermission) {
    throw new Error("report:view permission was not created above");
  }

  const rolesWithReportAccess = ["SUPER_ADMIN", "COMPANY_OWNER", "BRANCH_MANAGER", "FINANCE_MANAGER"] as const;
  await Promise.all(
    rolesWithReportAccess.map((roleName) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: dashboardRoles[roleName].id, permissionId: reportViewPermission.id },
        },
        update: {},
        create: { roleId: dashboardRoles[roleName].id, permissionId: reportViewPermission.id },
      }),
    ),
  );

  // Staff who confirm bookings (e.g. after verifying a deposit transfer) —
  // booking:update is the "staff operational" half of the booking
  // permission set; booking:create/read/cancel above are customer-only.
  const bookingUpdatePermission = permissions.find((p) => p.resource === "booking" && p.action === "update");
  if (!bookingUpdatePermission) {
    throw new Error("booking:update permission was not created above");
  }
  const rolesWithBookingUpdateAccess = ["SUPER_ADMIN", "COMPANY_OWNER", "BRANCH_MANAGER", "CUSTOMER_SUPPORT"] as const;
  await Promise.all(
    rolesWithBookingUpdateAccess.map((roleName) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: dashboardRoles[roleName].id, permissionId: bookingUpdatePermission.id },
        },
        update: {},
        create: { roleId: dashboardRoles[roleName].id, permissionId: bookingUpdatePermission.id },
      }),
    ),
  );

  // Staff who confirm Manual Bank Transfer payments were actually received
  // (checking the real bank statement) — same operational-staff role list
  // as booking:update, since these two actions typically go together.
  const paymentUpdatePermission = permissions.find((p) => p.resource === "payment" && p.action === "update");
  if (!paymentUpdatePermission) {
    throw new Error("payment:update permission was not created above");
  }
  await Promise.all(
    rolesWithBookingUpdateAccess.map((roleName) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: dashboardRoles[roleName].id, permissionId: paymentUpdatePermission.id },
        },
        update: {},
        create: { roleId: dashboardRoles[roleName].id, permissionId: paymentUpdatePermission.id },
      }),
    ),
  );

  // Staff who process refunds — finance-adjacent roles only, never CUSTOMER.
  const paymentRefundPermission = permissions.find((p) => p.resource === "payment" && p.action === "refund");
  if (!paymentRefundPermission) {
    throw new Error("payment:refund permission was not created above");
  }
  const rolesWithRefundAccess = ["SUPER_ADMIN", "COMPANY_OWNER", "FINANCE_MANAGER"] as const;
  await Promise.all(
    rolesWithRefundAccess.map((roleName) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: dashboardRoles[roleName].id, permissionId: paymentRefundPermission.id },
        },
        update: {},
        create: { roleId: dashboardRoles[roleName].id, permissionId: paymentRefundPermission.id },
      }),
    ),
  );

  // ---- Location ----
  const downtown = await prisma.location.upsert({
    where: { code: "NYC-DT" },
    update: {},
    create: {
      name: "Downtown NYC Branch",
      code: "NYC-DT",
      addressLine1: "123 Broadway",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "US",
      timezone: "America/New_York",
    },
  });

  // ---- Catalog ----
  const toyota = await prisma.brand.upsert({
    where: { slug: "toyota" },
    update: {},
    create: { name: "Toyota", slug: "toyota", countryOfOrigin: "Japan" },
  });

  const sedanCategory = await prisma.carCategory.upsert({
    where: { slug: "sedan" },
    update: {},
    create: { name: "Sedan", slug: "sedan", description: "Compact and mid-size sedans" },
  });

  const camry = await prisma.car.upsert({
    where: { vin: "4T1B11HK5KU123456" },
    update: {},
    create: {
      vin: "4T1B11HK5KU123456",
      licensePlate: "DEMO-001",
      brandId: toyota.id,
      categoryId: sedanCategory.id,
      model: "Camry",
      year: 2024,
      trim: "SE",
      color: "Silver",
      fuelType: "GASOLINE",
      transmission: "AUTOMATIC",
      seatingCapacity: 5,
      condition: "NEW",
      listingType: "BOTH",
      status: "AVAILABLE",
      dailyRentalRate: 65.0,
      salePrice: 28500.0,
      currentLocationId: downtown.id,
    },
  });

  // ---- Admin user + employee ----
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@drivehub.example" },
    update: {},
    create: { name: "Platform Admin", email: "admin@drivehub.example", emailVerified: true },
  });

  await Promise.all([
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    }),
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: dashboardRoles.SUPER_ADMIN.id } },
      update: {},
      create: { userId: adminUser.id, roleId: dashboardRoles.SUPER_ADMIN.id },
    }),
  ]);

  const adminEmployee = await prisma.employee.upsert({
    where: { employeeCode: "EMP-0001" },
    update: {},
    create: {
      userId: adminUser.id,
      employeeCode: "EMP-0001",
      locationId: downtown.id,
      jobTitle: "General Manager",
      hireDate: new Date("2024-01-15"),
      employmentStatus: "ACTIVE",
    },
  });

  // ---- Demo customer ----
  const customerUser = await prisma.user.upsert({
    where: { email: "jane.doe@example.com" },
    update: {},
    create: { name: "Jane Doe", email: "jane.doe@example.com", emailVerified: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customerUser.id, roleId: customerRole.id } },
    update: {},
    create: { userId: customerUser.id, roleId: customerRole.id },
  });

  const customerProfile = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      phone: "+1-212-555-0100",
      preferredLocationId: downtown.id,
    },
  });

  await prisma.driverLicense.upsert({
    where: {
      licenseNumber_issuingState_issuingCountry: {
        licenseNumber: "D1234567",
        issuingState: "NY",
        issuingCountry: "US",
      },
    },
    update: {},
    create: {
      customerId: customerProfile.id,
      licenseNumber: "D1234567",
      issuingState: "NY",
      issuingCountry: "US",
      issueDate: new Date("2020-06-01"),
      expiryDate: new Date("2028-06-01"),
      documentImageUrl: "https://placeholder.local/licenses/demo.jpg",
      verificationStatus: "VERIFIED",
      verifiedByEmployeeId: adminEmployee.id,
      verifiedAt: new Date(),
    },
  });

  // ---- Demo booking + payment ----
  const booking = await prisma.booking.upsert({
    where: { bookingNumber: "BK-0001" },
    update: {},
    create: {
      bookingNumber: "BK-0001",
      customerId: customerProfile.id,
      carId: camry.id,
      pickupLocationId: downtown.id,
      dropoffLocationId: downtown.id,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-05"),
      status: "CONFIRMED",
      dailyRate: 65.0,
      totalAmount: 260.0,
      depositAmount: 100.0,
    },
  });

  const existingPayment = await prisma.payment.findFirst({ where: { bookingId: booking.id } });
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        amount: 100.0,
        method: "CARD",
        provider: "STRIPE",
        status: "SUCCEEDED",
        bookingId: booking.id,
        paidByCustomerId: customerProfile.id,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
