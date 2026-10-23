import { demoVehicles } from '../../scripts/demo-vehicles';
import { test, expect, type Page } from '@playwright/test';
const login = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password', { exact: true }).fill('TestingPassword42!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next chapter starts here.' })).toBeVisible();
};
test.beforeEach(async ({ request }) => {
  const auth = await request.post('/api/auth/login', {
    data: { email: 'admin@example.com', password: 'TestingPassword42!' },
  });
  const { token } = await auth.json();
  const headers = { Authorization: `Bearer ${token}` };
  const listing = await request.get('/api/vehicles', { headers });
  for (const vehicle of (await listing.json()).vehicles)
    await request.delete('/api/vehicles/' + vehicle.id, { headers });
});
test('admin adds, edits, restocks, purchases, filters and deletes inventory', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Add vehicle', exact: true }).click();
  await page.getByLabel('Make', { exact: true }).fill('Porsche');
  await page.getByLabel('Model', { exact: true }).fill('911 Test');
  await page.getByLabel('Category', { exact: true }).selectOption('Coupe');
  await page.getByLabel('Price (USD)').fill('114400');
  await page.getByLabel('Quantity', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  const card = page.getByRole('article').filter({ hasText: '911 Test' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Edit vehicle' }).click();
  await page.getByLabel('Model', { exact: true }).fill('911 Carrera Test');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  const edited = page.getByRole('article').filter({ hasText: '911 Carrera Test' });
  await edited.getByRole('button', { name: 'Purchase vehicle' }).click();
  await page.getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(edited.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  await edited.getByRole('button', { name: 'Restock vehicle' }).click();
  await page.getByLabel('Units to add').fill('3');
  await page.getByRole('button', { name: 'Confirm restock' }).click();
  await expect(edited.getByText('3 in stock')).toBeVisible();
  await page.getByRole('searchbox').fill('nonexistent');
  await expect(page.getByText('No vehicles found')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(edited).toBeVisible();
  await page.reload();
  await expect(edited).toBeVisible();
  await edited.getByRole('button', { name: 'Delete vehicle' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(edited).toHaveCount(0);
});
test('customer registers, purchases, sees no admin actions and can sign out', async ({
  page,
  request,
}) => {
  const auth = await request.post('/api/auth/login', {
    data: { email: 'admin@example.com', password: 'TestingPassword42!' },
  });
  const { token } = await auth.json();
  await request.post('/api/vehicles', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      make: 'Toyota',
      model: 'Customer test car',
      category: 'Sedan',
      price: 25000,
      quantity: 1,
    },
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Full name').fill('Taylor Reed');
  await page.getByLabel('Email address').fill('taylor@example.com');
  await page.getByLabel('Password', { exact: true }).fill('CustomerPassword42!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next chapter starts here.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add vehicle', exact: true })).toHaveCount(0);
  const car = page.getByRole('article').filter({ hasText: 'Customer test car' });
  await car.getByRole('button', { name: 'Purchase vehicle' }).click();
  await page.getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(car.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
test('login errors are announced without navigating away', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email address').fill('wrong@example.com');
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword42!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
});
test('mobile dashboard fits the viewport and dialogs support keyboard dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Add vehicle', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('captures seeded desktop, mobile and sign-in screenshots', async ({ page, request }) => {
  const auth = await request.post('/api/auth/login', {
    data: { email: 'admin@example.com', password: 'TestingPassword42!' },
  });
  const { token } = await auth.json();
  for (const [make, model, category, price, quantity, year, fuel, color] of demoVehicles) {
    const res = await request.post('/api/vehicles', {
      headers: { Authorization: `Bearer ${token}` },
      data: { make, model, category, price, quantity, year, fuel, color },
    });
    expect(res.status()).toBe(201);
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/sign-in.png', fullPage: true });
  await login(page);
  await expect(page.getByRole('article')).toHaveCount(8);
  await page.screenshot({ path: 'docs/screenshots/desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'SUV', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByLabel('Maximum price').fill('60000');
  await page.getByLabel('In stock only').check();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('XC60 Recharge');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(8);
  await page.getByRole('button', { name: 'Add vehicle', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/add-vehicle.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
});
