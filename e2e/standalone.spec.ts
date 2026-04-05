import { test, expect } from '@playwright/test';
import {
  getMemberCount,
  addMemberByName,
  addExpense,
  deleteMember,
  deleteExpense,
} from './helpers';

test.describe('スタンドアローンモード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear sessionStorage to start fresh
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('A1: メンバー1人追加', async ({ page }) => {
    await addMemberByName(page, '田中');
    expect(await getMemberCount(page)).toBe(1);
  });

  test('A2: メンバー複数追加', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addMemberByName(page, '佐藤');
    expect(await getMemberCount(page)).toBe(3);
  });

  test('A3: 支出1件追加', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addExpense(page, 'ランチ代', 3000);

    await expect(page.getByText('ランチ代')).toBeVisible();
    await expect(page.getByText('3,000')).toBeVisible();
  });

  test('A4: 支出複数追加', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addExpense(page, 'ランチ代', 3000);
    await addExpense(page, 'カフェ代', 1500);
    await addExpense(page, 'タクシー代', 2000);

    await expect(page.getByText('ランチ代')).toBeVisible();
    await expect(page.getByText('カフェ代')).toBeVisible();
    await expect(page.getByText('タクシー代')).toBeVisible();
  });

  test('A5: 精算計算（均等割り）', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addExpense(page, 'ランチ代', 3000, 0);

    // 3000 / 2 = 1500 per person
    await expect(page.getByText('1,500')).toBeVisible();
  });

  test('A6: メンバー削除', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    expect(await getMemberCount(page)).toBe(2);

    await deleteMember(page, '鈴木');
    expect(await getMemberCount(page)).toBe(1);
  });

  test('A7: 支出削除', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addExpense(page, 'ランチ代', 3000);
    await expect(page.getByText('ランチ代')).toBeVisible();

    await deleteExpense(page, 'ランチ代');
    await expect(page.getByText('ランチ代')).not.toBeVisible();
  });

  test('A8: 金額0の支出は追加不可', async ({ page }) => {
    await addMemberByName(page, '田中');

    await page.locator('#expense-desc').fill('無料');
    await page.locator('#expense-amount').fill('0');

    // The add button in the expense form should be disabled
    const expenseForm = page.locator('#expense-desc').locator('..').locator('..');
    const addButton = expenseForm.getByRole('button', { name: '追加' });
    await expect(addButton).toBeDisabled();
  });

  test('A9: 空のメンバー名は追加不可', async ({ page }) => {
    await page.getByRole('button', { name: '名前で追加' }).click();

    // The add button next to the name input should be disabled when name is empty
    const nameInput = page.getByPlaceholder('名前を入力');
    const addButton = nameInput.locator('..').getByRole('button', { name: '追加' });
    await expect(addButton).toBeDisabled();
  });

  test('A10: 通貨切り替え', async ({ page }) => {
    // Default is JPY
    const jpyButton = page.getByRole('button', { name: 'JPY ¥' });
    const usdButton = page.getByRole('button', { name: 'USD $' });

    await expect(jpyButton).toBeVisible();
    await expect(usdButton).toBeVisible();

    // Switch to USD
    await usdButton.click();

    // Add a member and expense to verify currency symbol changes
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addExpense(page, 'ランチ代', 30);

    // Should show $ symbol in the expense display
    await expect(page.getByText('$')).toBeVisible();
  });

  test('A11: BTC価格表示', async ({ page }) => {
    // Wait for BTC price to load (may take a few seconds)
    // The price footer shows "BTC: ¥X,XXX,XXX" or similar
    const btcText = page.getByText(/BTC:/);
    await expect(btcText).toBeVisible({ timeout: 10000 });
  });

  test('A12: データ永続化（リロード）', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');
    await addExpense(page, 'ランチ代', 3000);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Data should persist via sessionStorage
    await expect(page.getByText('田中')).toBeVisible();
    await expect(page.getByText('ランチ代')).toBeVisible();
  });

  test('A13: 支払者選択', async ({ page }) => {
    await addMemberByName(page, '田中');
    await addMemberByName(page, '鈴木');

    const payerSelect = page.locator('#expense-payer');
    const options = payerSelect.locator('option');
    await expect(options).toHaveCount(2);
  });
});
