import type { Page } from '@playwright/test';

/**
 * Get the current member count from the heading "メンバー (N人)"
 */
export async function getMemberCount(page: Page): Promise<number> {
  const heading = page.getByRole('heading', { name: /メンバー/ });
  const text = await heading.textContent();
  const match = text?.match(/(\d+)人/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Add a member by name via the "名前で追加" tab
 */
export async function addMemberByName(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: '名前で追加' }).click();
  await page.getByPlaceholder('名前を入力').fill(name);
  // Click the add button within the member section (above the expense form)
  const memberSection = page.locator('.mb-6.rounded-xl').first();
  await memberSection.getByRole('button', { name: '追加' }).click();
  // Wait for member to appear in the list
  await page.getByText(name).waitFor();
}

/**
 * Add an expense with description, amount, and optional payer index
 */
export async function addExpense(
  page: Page,
  description: string,
  amount: number,
  payerIndex: number = 0,
): Promise<void> {
  await page.locator('#expense-desc').fill(description);
  await page.locator('#expense-amount').fill(String(amount));

  const payerSelect = page.locator('#expense-payer');
  const options = payerSelect.locator('option');
  const count = await options.count();
  if (count > payerIndex) {
    const value = await options.nth(payerIndex).getAttribute('value');
    if (value) {
      await payerSelect.selectOption(value);
    }
  }

  // Click the add button within the expense form section
  const expenseForm = page.locator('#expense-desc').locator('..').locator('..');
  await expenseForm.getByRole('button', { name: '追加' }).click();
  // Wait for the expense to appear
  await page.getByText(description).waitFor();
}

/**
 * Delete a member by clicking their trash icon and confirming
 */
export async function deleteMember(page: Page, memberName: string): Promise<void> {
  await page.getByRole('button', { name: `${memberName}を削除` }).click();
  // Confirm in the dialog
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await dialog.getByRole('button', { name: '削除する' }).click();
  await dialog.waitFor({ state: 'hidden' });
}

/**
 * Delete an expense by clicking its trash icon
 */
export async function deleteExpense(page: Page, expenseDesc: string): Promise<void> {
  await page.getByRole('button', { name: `${expenseDesc}を削除` }).click();
}
