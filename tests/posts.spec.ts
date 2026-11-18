import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const GHOST_USER = process.env.GHOST_USER!;
const GHOST_PASSWORD = process.env.GHOST_PASSWORD!;

test.describe('Gestión de publicaciones en Ghost', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ghost/#/signin');
    await page.getByRole('textbox', { name: 'Email address' }).fill(GHOST_USER);
    await page.getByRole('textbox', { name: 'Password' }).fill(GHOST_PASSWORD);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.getByRole('link', { name: 'Posts', exact: true })).toBeVisible();
  });

  test('CP-03 Crear y publicar un post', async ({ page }) => {
    const timestamp = Date.now();
    const postTitle = `Post Publicado QA ${timestamp}`;
    const postContent = `Contenido de prueba automatizada con Playwright para publicación (${timestamp}).`;

    await page.getByRole('link', { name: 'Posts', exact: true }).click();
    await expect(page).toHaveURL(/\/ghost\/#\/posts/);

    await page.getByRole('link', { name: 'New post' }).click();
    await expect(page).toHaveURL(/\/ghost\/#\/editor\/post/);

    const titleInput = page.getByPlaceholder('Post title');
    await titleInput.fill(postTitle);

    const bodyEditor = page.locator('[data-lexical-editor="true"]').first();
    await bodyEditor.click();
    await page.keyboard.type(postContent);

    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();

    await page.getByRole('button', { name: /Continue, final review/i }).click();

    const confirmPublishBtn = page.getByRole('button', { name: /Publish post, right now/i });
    await expect(confirmPublishBtn).toBeVisible();
    await confirmPublishBtn.click({ force: true });

    await expect(page.getByText(/Boom/i)).toBeVisible({ timeout: 10000 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: postTitle })).toBeVisible();
  });

  test('CP-04 Guardar un post como borrador', async ({ page }) => {
    const timestamp = Date.now();
    const draftTitle = `Post Borrador QA ${timestamp}`;
    const draftContent = `Contenido de prueba automatizada guardado como borrador (${timestamp}).`;

    await page.getByRole('link', { name: 'Posts', exact: true }).click();
    await expect(page).toHaveURL(/\/ghost\/#\/posts/);

    await page.getByRole('link', { name: 'New post' }).click();
    await expect(page).toHaveURL(/\/ghost\/#\/editor\/post/);

    const titleInput = page.getByPlaceholder('Post title');
    await titleInput.fill(draftTitle);

    const bodyEditor = page.locator('[data-lexical-editor="true"]').first();
    await bodyEditor.click();
    await page.keyboard.type(draftContent);

    await expect(page).toHaveURL(/\/ghost\/#\/editor\/post\/[a-f0-9]+/, { timeout: 10000 });

    await page.getByRole('link', { name: 'Posts' }).first().click();
    await expect(page).toHaveURL(/\/ghost\/#\/posts/);

    const draftItem = page.getByRole('listitem').filter({ hasText: draftTitle });
    await expect(draftItem).toBeVisible();
    await expect(draftItem).toContainText('Draft');
  });
});
