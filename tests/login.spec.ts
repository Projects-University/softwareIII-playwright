import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const GHOST_USER = process.env.GHOST_USER!;
const GHOST_PASSWORD = process.env.GHOST_PASSWORD!;

test.describe('Autenticación en Ghost', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ghost/#/signin');
  });

  test('CP-01 Login exitoso con credenciales válidas', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email address' }).fill(GHOST_USER);
    await page.getByRole('textbox', { name: 'Password' }).fill(GHOST_PASSWORD);
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/ghost\/#\/(dashboard|analytics|posts)/);
    await expect(page.getByRole('link', { name: 'Posts', exact: true })).toBeVisible();
  });

  test('CP-02 Login fallido con contraseña incorrecta', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email address' }).fill(GHOST_USER);
    await page.getByRole('textbox', { name: 'Password' }).fill('ClaveIncorrecta.2026*');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page.getByText('Your password is incorrect.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
    await expect(page).toHaveURL(/\/ghost\/#\/signin/);
  });
});
