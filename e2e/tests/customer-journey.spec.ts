import { expect, test } from "@playwright/test";
import { confirmManualPayment, signIn } from "../support/api";
import {
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  TEST_PASSWORD,
  futureBookingWindow,
  toDateInputValue,
  uniqueEmail,
} from "../support/test-data";
import { WEB_URL } from "../support/urls";

// Disjoint from admin-journey.spec.ts's window (700-900 days out) so the two
// specs never race for the same dates on the one seeded car — see
// futureBookingWindow's own doc comment for why this matters.
const BOOKING_WINDOW = futureBookingWindow(365, 200);

test.describe("Customer journey", () => {
  test("register, log in, find the seeded Camry, book it, pay by bank transfer, and see the invoice once staff confirm", async ({
    page,
    request,
  }) => {
    const name = "E2E Customer";
    const email = uniqueEmail("e2e-customer");

    await test.step("Register via the real sign-up form", async () => {
      await page.goto(`${WEB_URL}/`);
      await page.getByRole("link", { name: "Sign up" }).click();
      await expect(page).toHaveURL(`${WEB_URL}/sign-up`);

      await page.getByLabel("Full name").fill(name);
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page).toHaveURL(`${WEB_URL}/account`);
      await expect(page.getByText(email)).toBeVisible();
    });

    await test.step("Log out, then log back in", async () => {
      await page.getByRole("button", { name: "Sign out" }).click();
      // /account's own useEffect (redirect-if-no-session) can race the sign
      // out handler's own router.push("/") and win, landing on either "/"
      // or "/sign-in" — both are a valid signed-out state, not a bug in
      // this test's scope to work around further than tolerating either.
      await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/sign-in");

      await page.goto(`${WEB_URL}/sign-in`);
      await expect(page).toHaveURL(new RegExp(`${WEB_URL}/sign-in`));
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(`${WEB_URL}/account`);
    });

    await test.step("Search cars and find the seeded Camry", async () => {
      await page.getByRole("link", { name: "Browse Cars" }).click();
      await expect(page).toHaveURL(`${WEB_URL}/cars`);

      // CarFilters' <label>s aren't htmlFor-linked to their <Input>s, so
      // getByLabel can't find them — matched by placeholder instead.
      await page.getByPlaceholder("$0").fill("60");
      await page.getByPlaceholder("No limit").fill("70");
      await page.getByRole("button", { name: "Apply filters" }).click();
      await expect(page).toHaveURL(/minPrice=60/);

      await page.getByRole("link", { name: /Camry/ }).click();
      await expect(page.getByRole("heading", { name: /Camry/ })).toBeVisible();
    });

    await test.step("Book it for real dates", async () => {
      await page.getByLabel("Pickup").fill(toDateInputValue(BOOKING_WINDOW.startDate));
      await page.getByLabel("Return").fill(toDateInputValue(BOOKING_WINDOW.endDate));
      await expect(page.getByText("Estimated total")).toBeVisible();

      await page.getByRole("button", { name: "Book Now" }).click();
      await expect(page).toHaveURL(new RegExp(`${WEB_URL}/account/bookings/`));

      const bookingHeading = page.getByRole("heading", { name: /^BK-/ });
      await expect(bookingHeading).toBeVisible();
      const statusRow = bookingHeading.locator("xpath=..");
      await expect(statusRow.getByText("PENDING", { exact: true })).toBeVisible();
    });

    let paymentId = "";
    await test.step("Pay the deposit via Manual Bank Transfer", async () => {
      await page.getByRole("button", { name: "Bank Transfer" }).click();
      await expect(page).toHaveURL(/paymentId=/);

      const url = new URL(page.url());
      paymentId = url.searchParams.get("paymentId") ?? "";
      expect(paymentId).not.toBe("");

      const paymentRow = page.getByText("Payment", { exact: true }).locator("xpath=..");
      await expect(paymentRow.getByText("PENDING", { exact: true })).toBeVisible();
      await expect(page.getByText(/Reference DH-/)).toBeVisible();
    });

    await test.step("Staff confirms the transfer (direct API — no admin UI for this yet, see Testing-Strategy.md)", async () => {
      await signIn(request, { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD });
      const confirmed = await confirmManualPayment(request, paymentId);
      expect(confirmed.status).toBe("SUCCEEDED");
    });

    await test.step("Booking reflects the confirmation and an invoice appears", async () => {
      await page.reload();
      const bookingHeading = page.getByRole("heading", { name: /^BK-/ });
      const statusRow = bookingHeading.locator("xpath=..");
      await expect(statusRow.getByText("CONFIRMED", { exact: true })).toBeVisible();

      await page.goto(`${WEB_URL}/account`);
      const reference = paymentId.slice(0, 8).toUpperCase();
      await expect(page.getByText(new RegExp(`Payment ${reference}`))).toBeVisible();
    });
  });
});
