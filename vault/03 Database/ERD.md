---
status: accepted
owner: Database Engineer
sprint: 2
---

# ERD (text form)

Notation: `A ──< B` means one A has many B. `A ──1 B` means one-to-one. `A >──< B` means many-to-many (via join table, named in brackets).

## Identity & Access
```
User ──< Session
User ──< Account
User ──1 CustomerProfile
User ──1 Employee
User >──< Role   [UserRole]
Role >──< Permission   [RolePermission]
User ──< AuthenticationLog
```

## Fleet & Catalog (shared Rental + Sales inventory)
```
Brand ──< Car
CarCategory ──< Car
CarCategory ──< CarCategory        (self, parent/children)
Location ──< Car                  (currentLocation)
Car ──< CarImage
Car >──< CarFeature   [CarFeatureAssignment]
Car ──< PricingRule                (nullable, or via CarCategory)
CarCategory ──< PricingRule        (nullable, or via Car)
Car ──< AvailabilityBlock
AvailabilityBlock ──1 Booking            (nullable, when reason = BOOKED)
AvailabilityBlock ──1 MaintenanceRecord  (nullable, when reason = MAINTENANCE)
```

## Rental System
```
CustomerProfile ──< Booking
Car ──< Booking
Location ──< Booking   (pickupLocation)
Location ──< Booking   (dropoffLocation)
Booking ──< BookingExtension
Booking ──1 ReturnReport
ReturnReport ──1 DamageReport      (nullable)
Booking ──< DamageReport
Employee ──< DamageReport          (reportedBy)
Employee ──< ReturnReport          (inspectedBy, nullable)
DamageReport ──< DamageReportImage
```

## Sales System
```
Car ──< SaleTransaction
CustomerProfile ──< SaleTransaction
Employee ──< SaleTransaction       (salesEmployee)
SaleTransaction ──1 InstallmentPlan   (nullable)
InstallmentPlan ──< PaymentSchedule
SaleTransaction ──1 SalesContract     (nullable)
Employee ──< SalesContract         (signedBy, nullable)
```

## Finance
```
Booking ──< Payment            (nullable FK — one of three parents)
SaleTransaction ──< Payment    (nullable FK)
PaymentSchedule ──< Payment    (nullable FK)
CustomerProfile ──< Payment    (paidBy, required)
Payment ──< Refund
Employee ──< Refund            (processedBy, nullable)
CustomerProfile ──< Invoice
Booking ──< Invoice            (nullable)
SaleTransaction ──< Invoice    (nullable)
Invoice ──< InvoiceLineItem
Booking ──< RevenueLedgerEntry         (nullable)
SaleTransaction ──< RevenueLedgerEntry (nullable)
Location ──< RevenueLedgerEntry        (nullable)
```

## Operations
```
Vendor ──< MaintenanceRecord   (nullable)
Car ──< MaintenanceRecord
Car ──< ServiceSchedule
Car ──< InspectionReport
Booking ──< InspectionReport   (nullable)
Employee ──< InspectionReport  (inspectedBy)
InspectionReport ──< InspectionChecklistItem
```

## HR Module
```
Location ──< Employee
Department ──< Employee        (nullable)
Employee ──< Employee          (self: manager/reports)
Location ──< Department        (nullable)
Employee ──< Attendance
Employee ──< Payroll
Payroll ──< PayrollLineItem
SalaryRule ──< PayrollLineItem
Department ──< SalaryRule      (appliesTo, nullable)
```

## Customer System
```
User ──1 CustomerProfile
Location ──< CustomerProfile   (preferredLocation, nullable)
CustomerProfile ──< DriverLicense
Employee ──< DriverLicense     (verifiedBy, nullable)
CustomerProfile ──< Review
Car ──< Review                 (nullable)
Booking ──< Review              (nullable)
SaleTransaction ──< Review      (nullable)
CustomerProfile ──< LoyaltyTransaction
```

## Full-Platform Relationship Hubs
Three models sit at the center of most cross-domain joins — worth knowing when writing queries:
- **`Car`** — touched by fleet, pricing, availability, bookings, sales, maintenance, inspections, and reviews.
- **`CustomerProfile`** — the identity anchor for bookings, sales, payments, invoices, reviews, licenses, and loyalty; deliberately separate from `User` (auth identity) per DDD bounded-context separation.
- **`Employee`** — the identity anchor for HR (attendance/payroll) and for every "who did this" field across operations (inspections, damage reports, refunds, contract signing, license verification).
