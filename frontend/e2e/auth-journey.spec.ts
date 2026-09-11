import { test, expect } from "@playwright/test";
import { dismissOnboarding } from "./helpers";

const stamp = Date.now();
const email = `e2e-journey-${stamp}@example.com`;
const password = "e2epassword123";
const entryBody = `E2E journey entry ${stamp}: the quick brown fox.`;

test("signup -> login -> create entry -> persists -> logout", async ({ page }) => {
  await page.goto("/signup");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByTestId("signup-name-input").fill("E2E Journey");
  await page.getByTestId("signup-submit-button").click();
  await expect(page.getByTestId("today-date-heading")).toBeVisible();
  await dismissOnboarding(page);

  await page.getByTestId("today-editor-textarea").fill(entryBody);
  // Indicator copy is timing-dependent ("Saved just now" vs "Saved") — match the stable prefix.
  await expect(page.getByTestId("save-status-indicator")).toHaveText(/^Saved/);
  await page.reload();
  await expect(page.getByTestId("today-editor-textarea")).toHaveValue(entryBody);

  await page.getByTestId("sign-out-button").click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByTestId("login-submit-button").click();
  await expect(page.getByTestId("today-date-heading")).toBeVisible();
  await expect(page.getByTestId("today-editor-textarea")).toHaveValue(entryBody);
});
