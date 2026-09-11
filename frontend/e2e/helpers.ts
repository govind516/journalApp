import { Page, expect } from "@playwright/test";

// First-run onboarding renders as a modal over the app until dismissed
// (flag persisted in localStorage). Clear it before interacting further.
export async function dismissOnboarding(page: Page) {
  for (let i = 0; i < 5; i++) {
    const next = page.getByTestId("onboarding-next-button");
    if (await next.isVisible()) {
      await next.click();
      continue;
    }
    break;
  }
  const begin = page.getByTestId("onboarding-begin-button");
  if (await begin.isVisible()) {
    await begin.click();
  }
  await expect(page.getByTestId("onboarding-dialog")).toBeHidden();
}
