import { expect, test } from "@playwright/test";

test("works as a useful guide without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Planejador das Carracas de Epheria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Carraca de Epheria: Bravura" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Materiais e onde conseguir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ravikel · Olho da Okilua · Diárias" })).toBeVisible();
  await expect(page.getByText("Diária · [Permuta][Diário] Ilha de Iliya Agitada")).toBeVisible();
  await expect(page.getByText("Semanal · [Semanal] Investigar a ecologia da área de Lyngbakr")).toBeVisible();
  await expect(page.getByText(/Ilha de Iliya Agitada (I|II|III)$/)).toHaveCount(0);
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

test("estimates the remaining time and follows the inventory", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Bravura/ }).click();

  const heroEta = page.locator(".hero-stats div").filter({ hasText: "Tempo estimado" }).locator("strong");
  await expect(heroEta).toHaveText(/≈ \d+ (dia|dias|semanas|meses)/);

  await page.getByRole("button", { name: "Inventário" }).click();
  const summaryEta = page.locator(".inventory-summary > div").filter({ hasText: "Tempo até a Carraca" }).locator("strong");
  const before = await summaryEta.textContent();
  const combatRow = page.locator(".inventory-material-row").filter({ hasText: "Artefato dos Piratas Cox(Combate)" });
  await expect(combatRow.locator(".inventory-eta")).toHaveText(/≈/);

  await combatRow.getByRole("spinbutton").fill("250");
  await expect(combatRow.locator(".inventory-eta")).toHaveText("pronto");
  await expect(summaryEta).not.toHaveText(before ?? "");

  const cobaltRow = page.locator(".inventory-material-row").filter({ hasText: "Barra de Cobalto Brilhante" });
  await expect(cobaltRow.locator(".inventory-eta")).toHaveText(/≈/);
  await page.getByRole("spinbutton", { name: "Moedas Corvo" }).fill("300000");
  await expect(cobaltRow.locator(".inventory-eta")).toHaveText("com moedas");
});

test("orders the inventory by material and by time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Bravura/ }).click();
  await page.getByRole("button", { name: "Inventário" }).click();

  const names = page.locator(".inventory-material-row .item-label-text");
  const etas = page.locator(".inventory-material-row .inventory-eta");
  const byName = page.getByRole("button", { name: /^Ordenar por material/ });
  const byStock = page.getByRole("button", { name: /^Ordenar pelo estoque/ });
  const byMissing = page.getByRole("button", { name: /^Ordenar pelo que falta/ });
  const byTime = page.getByRole("button", { name: /^Ordenar pelo prazo/ });

  await byName.click();
  const ascending = await names.allTextContents();
  expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b, "pt-BR")));

  await byName.click();
  expect(await names.allTextContents()).toEqual([...ascending].reverse());

  // O primeiro clique em Tempo traz o prazo mais longo para o topo; o material sem meta no plano fica no fim.
  await byTime.click();
  const longestFirst = await etas.allTextContents();
  expect(longestFirst[0]).toMatch(/semanas|meses/);
  expect(longestFirst.at(-1)).toBe("—");

  await byTime.click();
  const shortestFirst = await etas.allTextContents();
  expect(shortestFirst[0]).toMatch(/\d+ dias?$/);
  expect(shortestFirst.at(-1)).toBe("—");

  // Estoque e falta reagem ao que o jogador digita, sem depender da ordem anterior.
  const pearl = page.locator(".inventory-material-row").filter({ hasText: "Cristal de Pérola Pura" });
  await pearl.getByRole("spinbutton").fill("7");
  await byStock.click();
  await expect(names.first()).toHaveText("Cristal de Pérola Pura");
  await byStock.click();
  await expect(names.first()).not.toHaveText("Cristal de Pérola Pura");

  await byMissing.click();
  const missing = page.locator(".inventory-material-row .inventory-missing, .inventory-material-row .inventory-done");
  const amounts = await missing.allTextContents();
  expect(amounts.at(-1)).toBe("—");
  const goals = amounts.slice(0, -1).map((value) => Number(value.replace(/\D/g, "")));
  expect(goals).toEqual([...goals].sort((a, b) => b - a));
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

test("lets the player choose which quests feed the estimate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Bravura/ }).click();

  // O ritmo do Olho Abissal depende da trilha do Ravikel que o preset mantém.
  await page.getByRole("button", { name: "Como obter" }).click();
  const abyssalEye = page.locator(".acquisition-card").filter({ hasText: "Olho Abissal" }).first();
  const abyssalRate = abyssalEye.locator("span").filter({ hasText: "Ritmo" }).locator("strong");
  const before = await abyssalRate.textContent();

  // Como obter também tem um filtro "Missões"; o primeiro botão é o do menu lateral.
  await page.getByRole("button", { name: "Missões" }).first().click();
  const ravikel = page.locator(".quest-group").filter({ has: page.getByRole("heading", { name: "Ravikel", exact: true }) });
  await expect(ravikel.getByText("TRILHA ÚNICA")).toBeVisible();
  await expect(ravikel.getByText("1/4 NO CÁLCULO")).toBeVisible();

  const youngSeaKing = ravikel.locator(".quest-card").filter({ hasText: "Rei do Mar Jovem" });
  const kandidum = ravikel.locator(".quest-card").filter({ hasText: "Caçador de Kandidum" });
  await expect(youngSeaKing.getByRole("checkbox")).toBeChecked();
  await expect(kandidum.getByRole("checkbox")).not.toBeChecked();

  // Aceitar a trilha das caçadas tira o Rei do Mar Jovem, como acontece no jogo.
  await kandidum.getByRole("checkbox").check();
  await expect(youngSeaKing.getByRole("checkbox")).not.toBeChecked();
  await expect(ravikel.getByText("3/4 NO CÁLCULO")).toBeVisible();

  // O material que só vinha da trilha abandonada passa a aparecer fora do cálculo.
  await page.getByRole("button", { name: "Como obter" }).click();
  await expect(abyssalEye.locator(".source-inactive").filter({ hasText: "Rei do Mar Jovem" })).toBeVisible();
  await expect(abyssalRate).not.toHaveText(before ?? "");

  // A escolha pertence ao preset e sobrevive ao recarregamento.
  await page.reload();
  await page.getByRole("button", { name: "Missões" }).click();
  await expect(ravikel.locator(".quest-card").filter({ hasText: "Rei do Mar Jovem" }).getByRole("checkbox")).not.toBeChecked();
});

test("lets the player choose which reward a quest hands over", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Bravura/ }).click();
  await page.getByRole("button", { name: "Missões" }).click();

  const caridade = page.locator(".quest-card").filter({ hasText: "A guilda não é uma instituição de caridade" });
  const madeira = caridade.locator(".quest-choice-option").filter({ hasText: "Madeira de Construção com um brilho de onda" });
  const compensada = caridade.locator(".quest-choice-option").filter({ hasText: "Madeira compensada com gravação de uma onda violenta" });

  // O preset começa no automático, com a sugestão na meta mais demorada entre as opções.
  await expect(caridade.locator(".quest-choice-option.picked")).toContainText("Automático");
  await expect(compensada).toContainText("(Recomendado)");

  await madeira.getByRole("radio").check();
  await expect(madeira).toHaveClass(/picked/);

  // A conclusão inteira passa a contar para o item escolhido, e a outra opção para de render.
  await page.getByRole("button", { name: "Como obter" }).click();
  const cardMadeira = page.locator(".acquisition-card").filter({ hasText: "Madeira de Construção com um brilho de onda" }).first();
  await expect(cardMadeira.locator(".source-card").filter({ hasText: "caridade" })).toContainText("Rende ≈ 5/dia");
  const cardCompensada = page.locator(".acquisition-card").filter({ hasText: "Madeira compensada com gravação de uma onda violenta" }).first();
  await expect(cardCompensada.locator(".source-card").filter({ hasText: "caridade" })).toContainText("A escolha desta missão está em");

  // A escolha pertence ao preset e sobrevive ao recarregamento.
  await page.reload();
  await page.getByRole("button", { name: "Missões" }).click();
  await expect(caridade.locator(".quest-choice-option.picked")).toContainText("Madeira de Construção com um brilho de onda");
});

test("lets the player choose where the crow coins are spent", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Bravura/ }).click();
  await page.getByRole("button", { name: "Estratégia" }).click();
  await page.getByRole("spinbutton", { name: "Moedas Corvo" }).fill("45000");

  const purchases = page.locator(".purchase");
  const parts = purchases.filter({ hasText: "Peças verdes da Carraca" });
  const blueGear = page.getByRole("checkbox", { name: "Acelerar os materiais do equipamento azul" });
  const carrackMaterials = page.getByRole("checkbox", { name: "Acelerar os materiais de construção da Carraca" });

  // O saldo acelera material desde o início; reservar peça é escolha explícita do jogador.
  await expect(parts).toHaveCount(0);
  await expect(blueGear).toBeChecked();

  await page.getByRole("checkbox", { name: "Comprar as peças verdes da Carraca" }).check();
  await expect(parts).toHaveText(/4 un\. × 10\.000 moedas/);
  await expect(parts.locator("em")).toHaveText("40.000");
  // As peças saem do topo do saldo e o saldo de hoje paga as quatro.
  await expect(parts).toContainText("agora");

  // Categoria desmarcada some do plano, e sem nenhuma liberada o saldo fica intacto.
  await blueGear.uncheck();
  await expect(purchases.filter({ hasText: "Artefato dos Piratas Cox" })).toHaveCount(0);
  await carrackMaterials.uncheck();
  await page.getByRole("checkbox", { name: "Comprar as peças verdes da Carraca" }).uncheck();
  await expect(page.getByText("Nenhum destino liberado")).toBeVisible();
  await expect(page.locator(".purchase-total strong")).toHaveText("45.000");

  // A escolha pertence ao preset e sobrevive ao recarregamento.
  await page.reload();
  await page.getByRole("button", { name: "Estratégia" }).click();
  await expect(blueGear).not.toBeChecked();
});
