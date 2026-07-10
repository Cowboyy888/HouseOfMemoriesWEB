import { expect, test } from "@playwright/test";
import {
  createBooking,
  createManualBankTransferPayment,
  fetchSeededCamry,
  getBooking,
  getMyInvoices,
  signUp,
} from "../support/api";
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, TEST_PASSWORD, futureBookingWindow, uniqueEmail } from "../support/test-data";
import { ADMIN_URL, API_URL } from "../support/urls";

// Disjoint from customer-journey.spec.ts's window (365-565 days out).
const BOOKING_WINDOW = futureBookingWindow(700, 200);

test.describe("Admin journey", () => {
  test("staff logs in, confirms a pending manual payment, and views the executive dashboard", async ({ page, request }) => {
    let paymentId = "";
    let bookingId = "";

    await test.step("Fixture setup — a throwaway customer books the Camry and starts a Manual Bank Transfer (not the thing under test; the admin journey starts at Login below)", async () => {
      await signUp(request, { name: "E2E Fixture Customer", email: uniqueEmail("e2e-admin-fixture"), password: TEST_PASSWORD });
      const camry = await fetchSeededCamry(request);
      if (!camry.currentLocation) {
        throw new Error("Seeded Camry has no currentLocation — cannot create a fixture booking");
      }
      const booking = await createBooking(request, {
        carId: camry.id,
        locationId: camry.currentLocation.id,
        startDate: BOOKING_WINDOW.startDate,
        endDate: BOOKING_WINDOW.endDate,
      });
      bookingId = booking.id;
      const payment = await createManualBankTransferPayment(request, {
        payableId: booking.id,
        amount: Number(booking.depositAmount),
      });
      expect(payment.status).toBe("PENDING");
      paymentId = payment.id;
    });

    await test.step("Log in as the seeded Super Admin", async () => {
      await page.goto(`${ADMIN_URL}/sign-in`);
      await page.getByLabel("Email").fill(SUPER_ADMIN_EMAIL);
      await page.getByLabel("Password").fill(SUPER_ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(`${ADMIN_URL}/dashboard`);
      await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible();
    });

    // "Add Car" is not exercised here — apps/api's cars module only exposes
    // GET endpoints (list/detail) and apps/admin has no car-management page
    // yet. Not fabricated; see Testing-Strategy.md and vault/04 Backend/Bookings.md
    // for what Sprint 9 explicitly left for a later feature sprint.

    await test.step("Approve the pending payment (no 'Approve Booking' admin UI exists yet — real API call, admin's own authenticated session)", async () => {
      const res = await page.request.post(`${API_URL}/payments/${paymentId}/confirm-manual`);
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("SUCCEEDED");
    });

    await test.step("Confirmation had the real effect — booking auto-confirmed, invoice generated", async () => {
      const confirmedBooking = await getBooking(request, bookingId);
      expect(confirmedBooking.status).toBe("CONFIRMED");

      const invoices = await getMyInvoices(request);
      const reference = paymentId.slice(0, 8).toUpperCase();
      const hasMatchingInvoice = invoices.items.some((invoice) =>
        invoice.lineItems.some((item) => item.description.includes(reference)),
      );
      expect(hasMatchingInvoice).toBe(true);
    });

    await test.step("View the executive report", async () => {
      await page.reload();
      const availableCarsCard = page.locator('[data-slot="card"]').filter({ hasText: "Available Cars" });
      await expect(availableCarsCard).toBeVisible();
      await expect(availableCarsCard.getByText("1", { exact: true })).toBeVisible();

      await expect(page.getByText("Total Revenue")).toBeVisible();
      await expect(page.getByText("Pending Bookings")).toBeVisible();
    });
  });
});
