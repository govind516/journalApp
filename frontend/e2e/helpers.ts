import { Page, expect } from "@playwright/test";

// First-run onboarding is skippable from the first screen; fall back to the
// old step-through only if the skip affordance ever goes missing.
export async function dismissOnboarding(page: Page) {
  const skip = page.getByTestId("onboarding-skip-button");
  if (await skip.isVisible()) {
    await skip.click();
  } else {
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
  }
  await expect(page.getByTestId("onboarding-dialog")).toBeHidden();
}
