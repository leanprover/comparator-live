import { expect, test } from "@playwright/test";

test.describe("The add student functionality", () => {
  test("should appear", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Enter new student's name:")).toBeVisible();
  });

  test("should require some auth", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Enter new student's name:").focus();
    await page.keyboard.type("Hank");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Invalid credentials")).toHaveCount(1);
  });

  test("should require valid auth", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Enter credentials").fill("not the password");
    await page.getByLabel("Enter new student's name:").focus();
    await page.keyboard.type("Hank");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Invalid credentials")).toHaveCount(1);
  });

  test("should work with valid auth", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Enter credentials").fill("password");
    await page.getByLabel("Enter new student's name:").focus();
    await page.keyboard.type("Hank");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Record created for student 'Hank' with ID ")).toHaveCount(1);
  });
});
