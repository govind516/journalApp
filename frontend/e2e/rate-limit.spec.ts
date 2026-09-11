import { test, expect } from "@playwright/test";

const stamp = Date.now();

// Self-calibrating: earlier specs may have consumed part of the shared IP
// budget, so hammer until 429 appears (cap 15) instead of assuming a fresh
// bucket — then prove the UI surfaces it.
test("login rate limit surfaces 429 in the UI", async ({ page, request }) => {
  let blocked = false;
  for (let i = 0; i < 15 && !blocked; i++) {
    const res = await request.post("http://localhost:8000/api/auth/login", {
      data: { email: `e2e-rl-${stamp}-${i}@example.com`, password: "wrongpassword" },
    });
    blocked = res.status() === 429;
  }
  expect(blocked).toBe(true);

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(`e2e-rl-ui-${stamp}@example.com`);
  await page.locator('input[type="password"]').fill("wrongpassword");
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("auth-error-message")).toHaveText("Too many attempts, please try again later");
});
