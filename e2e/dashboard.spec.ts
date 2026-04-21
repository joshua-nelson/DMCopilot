import { expect, test } from "@playwright/test";

test("/sign-in loads (no 500)", async ({ page }) => {
  const res = await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible();
});

test("/dashboard does not 500 (redirects when unauthenticated)", async ({ page }) => {
  const res = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBeLessThan(500);

  // When not authenticated, Clerk middleware should send us to /sign-in.
  // If the environment injects an authenticated session, we may stay on /dashboard.
  await expect(page).toHaveURL(/\/sign-in|\/dashboard/);
});
