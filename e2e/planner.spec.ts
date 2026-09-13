import { expect, test } from "@playwright/test";

test("works as a useful guide without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Planejador das Carracas de Epheria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Carraca de Epheria: Bravura" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Materiais e onde conseguir" })).toBeVisible();
  await context.close();
});

test("loads the ship and equipment artwork in the overview", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Gradual/ }).click();

  const heroImage = page.locator(".hero-art img");
  await expect(heroImage).toBeVisible();
  await expect(heroImage).toHaveAttribute("src", /epheria-caravel/);
  await expect.poll(() => heroImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

  const equipmentImages = page.locator(".gear-mini .item-icon");
  await expect(equipmentImages).toHaveCount(8);
  await expect.poll(() => equipmentImages.evaluateAll((images: HTMLImageElement[]) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
});

test("keeps the active screen below the sticky navigation on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Gradual/ }).click();
  await page.getByRole("button", { name: "Inventário" }).click();

  const heading = page.getByRole("heading", { name: "Inventário de materiais" });
  const sidebar = page.locator(".sidebar");
  await expect(heading).toBeVisible();
  await expect.poll(async () => {
    const headingBox = await heading.boundingBox();
    const sidebarBox = await sidebar.boundingBox();
    return Boolean(headingBox && sidebarBox && headingBox.y >= sidebarBox.y + sidebarBox.height);
  }).toBe(true);
});

test("creates different and repeated presets with independent persisted progress", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Qual Carraca você quer planejar?" })).toBeVisible();
  await page.getByRole("button", { name: /Bravura/ }).click();
  await expect(page.getByRole("heading", { name: "Rota para sua Carraca" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Passe" })).toHaveCount(0);

  await page.getByRole("button", { name: "Inventário" }).click();
  const combatStock = page.getByRole("spinbutton", { name: /Estoque de Artefato dos Piratas Cox.*Combate/ });
  await combatStock.fill("12");

  await page.getByRole("button", { name: /Adicionar preset/ }).click();
  await page.getByRole("button", { name: /Gradual/ }).click();
  await page.getByRole("button", { name: /Adicionar preset/ }).click();
  await page.getByRole("button", { name: /Bravura/ }).click();
  await expect(page.getByLabel("Preset ativo")).toHaveValue(/.+/);

  await page.getByRole("button", { name: "Inventário" }).click();
  await expect(combatStock).toHaveValue("0");
  await page.getByLabel("Preset ativo").selectOption({ label: "Bravura 1" });
  await expect(combatStock).toHaveValue("12");
  await page.reload();
  await expect(page.getByLabel("Preset ativo")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Inventário" }).click();
  await expect(combatStock).toHaveValue("12");
});

test("removes a preset added by mistake from the sidebar", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await page.getByRole("button", { name: /Bravura/ }).click();
  await page.getByRole("button", { name: /Adicionar preset/ }).click();
  await page.getByRole("button", { name: /Bravura/ }).click();

  const selector = page.getByLabel("Preset ativo");
  await expect(selector.locator("option")).toHaveCount(2);
  await expect(selector).toHaveValue(/.+/);

  await page.getByRole("button", { name: /Remover preset ativo/ }).click();
  await expect(selector.locator("option")).toHaveCount(1);
  await expect(selector.locator("option")).toHaveText(["Bravura 1"]);

  await page.getByRole("button", { name: /Remover preset ativo/ }).click();
  await expect(page.getByRole("heading", { name: "Qual Carraca você quer planejar?" })).toBeVisible();
});
