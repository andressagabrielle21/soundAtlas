import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("cadastro até estatísticas de uma escuta no celular", async ({ page }) => {
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  const title = "Horizonte de Teste";
  const note = "Escuta registrada no fluxo mobile.";

  await test.step("Criar a conta e abrir o Discover", async () => {
    await page.goto("/cadastrar");
    await page.getByLabel("Nome de usuário").fill(username);
    await page.getByLabel("E-mail").fill(`${username}@example.com`);
    await page.getByLabel("Senha").fill("SoundAtlas-E2E-123!");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(
      page.getByRole("heading", { name: "Discover", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/discover$/);
    await expect(
      page.getByRole("button", { name: /Lançamento de Teste/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Biblioteca", exact: true }).click();
    await page
      .getByRole("main")
      .getByRole("link", { name: "Discover" })
      .click();
    await expect(
      page.getByRole("button", { name: /Lançamento de Teste/ }),
    ).toBeVisible();
  });

  await test.step("Buscar o álbum e adicioná-lo à biblioteca", async () => {
    await page.getByRole("link", { name: "Buscar", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Título ou artista" })
      .fill("Horizonte de Tes");
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const listened = page.getByRole("button", { name: "Já ouvi", exact: true });
    await listened.tap();
    await expect(listened).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Remover da biblioteca" }),
    ).toBeVisible();
  });

  await test.step("Salvar a avaliação de 4,5 estrelas", async () => {
    const review = page.getByRole("region", { name: "Nota e resenha" });
    await review
      .getByRole("button", { name: "5 de 5 estrelas", exact: true })
      .tap();
    await review.getByRole("button", { name: "Meia estrela" }).tap();
    await expect(
      review.getByText("4,5 de 5 estrelas", { exact: true }),
    ).toBeVisible();
    await review
      .getByLabel("Resenha", { exact: true })
      .fill("Resenha do fluxo mobile.");
    await review.getByRole("button", { name: "Salvar avaliação" }).click();
    await expect(review.getByRole("status")).toHaveText("Avaliação salva.");
  });

  await test.step("Registrar a escuta com nota histórica de 3,5 estrelas", async () => {
    await page.getByRole("button", { name: "Registrar escuta" }).click();
    const dialog = page.getByRole("dialog", { name: "Registrar escuta" });
    await dialog
      .getByRole("button", { name: "4 de 5 estrelas", exact: true })
      .tap();
    await dialog.getByRole("button", { name: "Meia estrela" }).tap();
    await expect(
      dialog.getByText("3,5 de 5 estrelas", { exact: true }),
    ).toBeVisible();
    await dialog.getByLabel("Comentário (opcional)").fill(note);
    await dialog.getByRole("button", { name: "Registrar escuta" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText("Escuta registrada.", { exact: true }),
    ).toBeVisible();
  });

  await test.step("Conferir a escuta no diário", async () => {
    await page.getByRole("link", { name: "Perfil", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Diário", exact: true }),
    ).toBeVisible();
    const entry = page.getByRole("listitem").filter({ hasText: note });
    await expect(entry.getByRole("link", { name: title })).toBeVisible();
    await expect(
      entry.getByText("3,5 de 5 estrelas", { exact: false }),
    ).toBeVisible();
  });

  await test.step("Conferir os agrupamentos nas estatísticas", async () => {
    await expect(
      page.getByRole("heading", { name: "Estatísticas", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Tudo", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Tudo", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    const decade = page.getByRole("link", { name: "Anos 1990 1", exact: true });
    await expect(decade).toBeVisible();
    const rating = page
      .getByRole("listitem")
      .filter({ hasText: "3,5 estrelas" });
    await expect(rating.getByText("1", { exact: true })).toBeVisible();
  });
  await test.step("Encerrar a sessão", async () => {
    await page.getByRole("button", { name: "Sair", exact: true }).tap();
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/entrar$/);
  });
});
