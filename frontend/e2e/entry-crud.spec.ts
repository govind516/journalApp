import { test, expect } from "@playwright/test";
import { dismissOnboarding } from "./helpers";

const stamp = Date.now();
const email = `e2e-crud-${stamp}@example.com`;
const created = `E2E crud body ${stamp}: pack my box.`;
const edited = `E2E crud body ${stamp}: edited five dozen.`;

test("entry CRUD through the UI", async ({ page }) => {
  await page.goto("/signup");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("e2epassword123");
  await page.getByTestId("signup-name-input").fill("E2E Crud");
  await page.getByTestId("signup-submit-button").click();
  await expect(page.getByTestId("today-date-heading")).toBeVisible();
  await dismissOnboarding(page);

  // Create (autosave) and confirm persistence across reload.
  await page.getByTestId("today-editor-textarea").fill(created);
  await expect(page.getByTestId("save-status-indicator")).toHaveText(/^Saved/);
  await page.reload();
  await expect(page.getByTestId("today-editor-textarea")).toHaveValue(created);

  // Open from timeline, edit, verify.
  await page.goto("/app/timeline");
  await page.getByText(created).click();
  await expect(page.getByTestId("entry-full-content")).toHaveText(created);
  await page.getByTestId("edit-entry-button").click();
  await page.getByTestId("entry-edit-textarea").fill(edited);
  await page.getByTestId("save-entry-edit-button").click();
  await expect(page.getByTestId("entry-full-content")).toHaveText(edited);

  // Delete and confirm it's gone.
  await page.getByTestId("delete-entry-button").click();
  await page.getByTestId("confirm-delete-button").click();
  await page.goto("/app/timeline");
  await expect(page.getByText(edited)).toBeHidden();
});
