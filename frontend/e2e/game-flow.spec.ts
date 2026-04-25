import { test, expect } from "@playwright/test";
import { captureConsoleAndNetwork } from "./capture-helpers";

/**
 * E2E tests for Knowledge Things.
 * Captures: screenshots per step, console errors, network failures.
 * Produces e2e-report.md for AI analysis.
 */
test.describe("Game flow", () => {
  test("create room, start game, answer first question", async ({ page }, testInfo) => {
    const capture = await captureConsoleAndNetwork(page);

    const screenshot = async (name: string) => {
      const path = testInfo.outputPath(`${name}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(name, { path, contentType: "image/png" });
    };

    await test.step("1. Home — load app", async () => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /Knowledge Things/i })).toBeVisible({
        timeout: 10_000,
      });
      await screenshot("01-home");
    });

    await test.step("2. Click Math subject", async () => {
      await expect(page.getByRole("tab", { name: /New Game/i })).toBeVisible();
      await page.getByRole("button", { name: /Math/i }).first().click();
      await screenshot("02-subject-picked");
    });

    await test.step("3. Topic & Grade — click Next", async () => {
      await expect(page.getByText(/Choose Topic/i)).toBeVisible({ timeout: 5_000 });
      await page.getByRole("button", { name: /Next/i }).click();
      await screenshot("03-topic-grade");
    });

    await test.step("4. Enter name and Create Room", async () => {
      const nicknameInput = page.getByPlaceholder(/What should we call you/i).or(page.getByLabel(/YOUR NICKNAME/i));
      await expect(nicknameInput).toBeVisible({ timeout: 10_000 });
      await nicknameInput.fill("E2ETest");
      // Wait for socket connection (Create Room enabled when connected)
      const createBtn = page.getByRole("button", { name: /Create Room/i });
      await expect(createBtn).toBeEnabled({ timeout: 15_000 });
      await createBtn.click();
      await screenshot("04-create-room");
    });

    await test.step("5. Wait for room redirect", async () => {
      await expect(page).toHaveURL(/\/room\/[A-Z0-9]+/, { timeout: 15_000 });
      await screenshot("05-room-redirect");
    });

    await test.step("6. Waiting Room — Start Game", async () => {
      await expect(page.getByText(/Room Code/i)).toBeVisible({ timeout: 10_000 });
      const startBtn = page.getByRole("button", { name: /Start Game/i });
      await expect(startBtn).toBeVisible({ timeout: 10_000 });
      await startBtn.click();
      await screenshot("06-waiting-room");
    });

    await test.step("7. Wait for questions to load", async () => {
      const loadingMsg = page.getByText("AI is generating your questions...");
      await expect(loadingMsg).toBeVisible({ timeout: 5_000 });
      await expect(loadingMsg).not.toBeVisible({ timeout: 30_000 });
      await screenshot("07-questions-loading");
    });

    await test.step("8. Game Screen — first question", async () => {
      await expect(page.getByText(/Q\d+ of \d+/)).toBeVisible({ timeout: 10_000 });
      await screenshot("08-game-screen");
    });

    await test.step("9. Answer first question", async () => {
      const mcqButton = page.getByRole("button", { name: /^Answer A:/i }).first();
      const textInput = page.getByPlaceholder(/Your answer/i);

      if (await mcqButton.isVisible()) {
        await mcqButton.click();
      } else if (await textInput.isVisible()) {
        await textInput.fill("42");
        await page.getByRole("button", { name: /Submit/i }).click();
      }
      await screenshot("09-answer-submitted");
    });

    await test.step("10. Verify feedback", async () => {
      await expect(
        page
          .getByText(/Correct!/i)
          .or(page.getByText(/Correct answer:|Not quite|Try again/i))
      ).toBeVisible({ timeout: 10_000 });
      await screenshot("10-feedback");
    });

    // Attach console/network capture for AI analysis (always, so AI sees clean run or errors)
    await testInfo.attach("e2e-capture", {
      body: JSON.stringify(capture.toJSON(), null, 2),
      contentType: "application/json",
    });
  });

  test("join game flow: create room in one browser, join in another", async ({ page, browser }, testInfo) => {
    const capture = await captureConsoleAndNetwork(page);
    const hostPage = page;
    const joinerPage = await browser.newPage();
    await captureConsoleAndNetwork(joinerPage);

    try {
      let roomId: string;

      await test.step("Host: create room", async () => {
        await hostPage.goto("/");
        await expect(hostPage.getByRole("heading", { name: /Knowledge Things/i })).toBeVisible({
          timeout: 10_000,
        });
        await hostPage.getByRole("button", { name: /Math/i }).first().click();
        await expect(hostPage.getByText(/Choose Topic/i)).toBeVisible({ timeout: 5_000 });
        await hostPage.getByRole("button", { name: /Next/i }).click();

        const nicknameInput = hostPage
          .getByPlaceholder(/What should we call you/i)
          .or(hostPage.getByLabel(/YOUR NICKNAME/i));
        await expect(nicknameInput).toBeVisible({ timeout: 10_000 });
        await nicknameInput.fill("E2EHost");

        const createBtn = hostPage.getByRole("button", { name: /Create Room/i });
        await expect(createBtn).toBeEnabled({ timeout: 15_000 });
        await createBtn.click();

        await expect(hostPage).toHaveURL(/\/room\/([A-Z0-9]+)/, { timeout: 15_000 });
        const match = hostPage.url().match(/\/room\/([A-Z0-9]+)/);
        roomId = match![1]!;
      });

      await test.step("Joiner: load Join tab and fill form", async () => {
        await joinerPage.goto("/?tab=join");
        await expect(joinerPage.getByRole("heading", { name: /Knowledge Things/i })).toBeVisible({
          timeout: 10_000,
        });
        await joinerPage.getByRole("tab", { name: /Join Game/i }).click();
        await expect(joinerPage.getByRole("heading", { name: /Join a Game/i })).toBeVisible();

        await joinerPage.getByLabel(/Room Code/i).fill(roomId);
        await joinerPage.getByLabel(/Your Nickname/i).fill("E2EJoiner");
      });

      await test.step("Joiner: click Join and verify redirect to room", async () => {
        const joinBtn = joinerPage.getByRole("button", { name: /Join Game/i });
        await expect(joinBtn).toBeEnabled({ timeout: 15_000 });
        await joinBtn.click();

        await expect(joinerPage).toHaveURL(new RegExp(`/room/${roomId}`), { timeout: 15_000 });
      });

      await test.step("Joiner: verify in waiting room", async () => {
        await expect(joinerPage.getByText(/Room Code/i)).toBeVisible({ timeout: 10_000 });
        await expect(joinerPage.getByText(roomId)).toBeVisible();
      });
    } finally {
      await joinerPage.close();
    }

    await testInfo.attach("e2e-capture", {
      body: JSON.stringify(capture.toJSON(), null, 2),
      contentType: "application/json",
    });
  });
});
