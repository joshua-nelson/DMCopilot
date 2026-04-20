import { expect, test } from "@playwright/test";

test("dashboard empty state renders", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create your first campaign" }),
  ).toBeVisible();
});
