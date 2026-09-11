import { test, expect } from "@playwright/test";

const stamp = Date.now();
const email = `e2e-errors-${stamp}@example.com`;

// Enumeration parity end-to-end: wrong password vs nonexistent user must
// show byte-identical UI errors (backend timing work is unit-tested; this
// proves the UI doesn't reintroduce a distinction).
test("wrong password and ghost user show identical errors", async ({ page, request }) => {
  await request.post("http://localhost:8000/api/auth/signup", {
    data: { name: "E2E Errors", email, password: "e2epassword123", timezone: "UTC" },
  });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("definitely-wrong");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("auth-error-message")).toHaveText("Email or password not recognised");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(`e2e-ghost-${stamp}@example.com`);
  await page.locator('input[type="password"]').fill("definitely-wrong");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("auth-error-message")).toHaveText("Email or password not recognised");
});
