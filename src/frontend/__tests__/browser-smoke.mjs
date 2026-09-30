const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright"
);
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.BROWSER_TEST_URL || "http://127.0.0.1:3015";
const chromePath =
  process.env.CHROME_EXECUTABLE ||
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});
await fs.mkdir("work/remediation/browser-results", { recursive: true });
const evidence = [];
const user = {
  id: "fixture-user-a",
  name: "Synthetic Tester",
  email: "synthetic@example.test",
  image: null,
  isOnboarded: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-30T00:00:00.000Z",
  lastLoginAt: null,
};
const mkChat = (id, title, isPrivacy = false) => ({
  id,
  title,
  isPrivacy,
  participants: ["A", "B"],
  userId: user.id,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  deletedAt: null,
});
const vibe = {
  type: "vibe_check",
  overallVibe: "positive",
  keywords: ["synthetic"],
  emojiScore: 7,
  humorDetected: false,
  moodDescriptors: ["friendly"],
  messageRefs: [],
  sampling: {
    totalMessages: 61,
    sampledMessages: 10,
    qualitativeSampled: true,
    statisticsScope: "full_conversation",
    timeBasis: "UTC",
    currentStreakBasis: "latest_message_day",
  },
};
const mkAnalysis = (chatId, status = "COMPLETED") => ({
  id: `analysis-${chatId}`,
  chatId,
  userId: user.id,
  status,
  type: "VibeCheck",
  result: status === "COMPLETED" ? vibe : {},
  error: status === "FAILED" ? "Synthetic provider failure" : null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  deletedAt: null,
});
async function fixture(page) {
  const state = {
    credits: 24,
    chats: Array.from({ length: 61 }, (_, i) =>
      mkChat(`chat-${i}`, `Fixture chat ${String(i).padStart(2, "0")}`),
    ),
    analyses: [mkAnalysis("chat-0", "FAILED")],
    privacyMode: "success",
    privacyKeys: [],
    regularCalls: 0,
    regularKeys: [],
    failBootstrap: false,
    lostRegular: false,
    lostStatus: false,
    sandboxAmount: 0,
    deletions: 0,
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const endpoint = url.pathname;
    const body = req.postDataJSON();
    const reply = (data, status = 200, headers = {}) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers,
        body: JSON.stringify({
          success: status < 400,
          data,
          ...(status >= 400 ? { error: "Synthetic insufficient credits" } : {}),
        }),
      });
    const paged = (items) => {
      const start = url.searchParams.has("cursor")
        ? Number(url.searchParams.get("cursor"))
        : 0;
      const end = Math.min(items.length, start + 50);
      return reply(items.slice(start, end), 200, {
        "X-Page-Limit": "50",
        "X-Has-More": String(end < items.length),
        "X-Next-Cursor": end < items.length ? String(end) : "",
      });
    };
    if (endpoint === "/api/user") {
      if (req.method() === "DELETE") state.deletions++;
      return reply(req.method() === "DELETE" ? undefined : user);
    }
    if (endpoint === "/api/credit")
      return reply([
        {
          id: "credit-fixture",
          userId: user.id,
          amount: state.credits,
          availableAmount: state.credits + state.sandboxAmount,
          canAnalyze: state.credits >= 8 || state.sandboxAmount >= 8,
          billingEnvironment:
            state.sandboxAmount > 0 ? "sandbox" : "production",
          sandboxAmount: state.sandboxAmount,
        },
      ]);
    if (endpoint === "/api/subscription") return reply(null);
    if (endpoint === "/api/chat") {
      if (state.failBootstrap) {
        state.failBootstrap = false;
        return reply(undefined, 503);
      }
      return paged(state.chats);
    }
    if (endpoint === "/api/message")
      return paged(
        Array.from({ length: 61 }, (_, i) => ({
          id: `m-${i}`,
          chatId: url.searchParams.get("chatId"),
          userId: user.id,
          sender: "A",
          content: `Synthetic message ${i}`,
          timestamp: user.createdAt,
        })),
      );
    if (endpoint === "/api/analysis") {
      if (req.method() === "POST") {
        state.regularCalls++;
        state.regularKeys.push(body.requestKey);
        state.analyses = [mkAnalysis(body.chatId)];
        if (state.lostRegular) {
          state.lostRegular = false;
          state.lostStatus = true;
          state.credits = 0;
          return route.abort("failed");
        }
        return reply(state.analyses);
      }
      if (state.lostStatus) {
        state.lostStatus = false;
        return reply(undefined, 503);
      }
      const chatId = url.searchParams.get("chatId");
      return paged(
        chatId
          ? state.analyses.filter((a) => a.chatId === chatId)
          : state.analyses,
      );
    }
    if (endpoint === "/api/privacy-analysis") {
      state.privacyKeys.push(body.requestKey);
      if (state.privacyMode === "pending") {
        state.privacyMode = "success";
        state.credits = 0;
        return reply(
          {
            chat: null,
            analyses: [],
            job: { id: "synthetic-job", status: "PROCESSING" },
          },
          202,
        );
      }
      if (state.privacyMode === "insufficient") {
        state.credits = 0;
        return reply(undefined, 402);
      }
      const chat = mkChat(
        body.isGhostMode ? "ephemeral-ghost" : "saved-private",
        body.title,
        true,
      );
      const analyses = [mkAnalysis(chat.id)];
      if (!body.isGhostMode) {
        state.chats.push(chat);
        state.analyses.push(...analyses);
      }
      return reply({ chat, analyses });
    }
    if (endpoint === "/api/auth/web/logout") return reply(undefined);
    return reply(undefined, 404);
  });
  return state;
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  assert(
    size.width <= size.viewport,
    `${label} overflow: ${JSON.stringify(size)}`,
  );
  evidence.push(`${label}: width ${size.width}/${size.viewport}`);
}
async function openCreate(page) {
  await page
    .getByRole("button", { name: "Expand chat sidebar" })
    .click()
    .catch(() => {});
  await page.getByRole("button", { name: "New Chat", exact: true }).click();
  await page
    .getByLabel("Chat Title", { exact: true })
    .fill("Synthetic private draft");
  await page.getByLabel("Input format").selectOption("manual");
  await page.getByLabel("Sender", { exact: true }).fill("A");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Private synthetic message");
  await page.getByRole("button", { name: "Add Message", exact: true }).click();
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    const state = await fixture(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/home`);
    await page.getByText("Synthetic provider failure").waitFor();
    await noOverflow(page, `home ${width}`);
    assert.equal(
      await page.getByText("61 messages", { exact: true }).count(),
      1,
    );
    const retry = page.getByRole("button", {
      name: "Retry Analysis (8 credits)",
      exact: true,
    });
    await retry.focus();
    await page.keyboard.press("Enter");
    await page
      .getByText("Overall energy & chemistry", { exact: true })
      .waitFor();
    assert.equal(state.regularCalls, 1);
    await page
      .getByText(/Qualitative insights use 10 of 61 messages/)
      .waitFor();
    evidence.push(
      `home ${width}: failed retry via Enter, full message traversal, sample disclosure`,
    );
    if (width === 1440) {
      await page
        .getByRole("button", { name: "Fixture chat 60", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("heading", { name: "Fixture chat 60", exact: true })
        .waitFor();
      const separator = page.getByRole("separator", {
        name: "Resize chat sidebar",
      });
      await separator.focus();
      const before = Number(await separator.getAttribute("aria-valuenow"));
      await page.keyboard.press("ArrowRight");
      assert.equal(
        Number(await separator.getAttribute("aria-valuenow")),
        before + 20,
      );
      evidence.push(
        "desktop: chat61 reachable by keyboard, separator ArrowRight resizes",
      );
    }
    await page.screenshot({
      path: `work/remediation/browser-results/home-${width}.png`,
      fullPage: true,
    });
    await page.goto(`${base}/profile`);
    await page.getByRole("heading", { name: "PROFILE_SETTINGS" }).waitFor();
    await noOverflow(page, `profile ${width}`);
    await page.screenshot({
      path: `work/remediation/browser-results/profile-${width}.png`,
      fullPage: true,
    });
    await page.goto(`${base}/contact`);
    await page.getByText("Ping Support", { exact: true }).waitFor();
    await noOverflow(page, `contact ${width}`);
    await page.screenshot({
      path: `work/remediation/browser-results/contact-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const state = await fixture(page);
  await page.goto(`${base}/home`);
  await page.getByText("Synthetic provider failure").waitFor();
  await openCreate(page);
  await page.getByRole("button", { name: "Privacy Mode", exact: true }).click();
  state.privacyMode = "pending";
  await page
    .getByRole("button", { name: "Create Privacy Analysis", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Check / retry existing request",
      exact: true,
    })
    .waitFor();
  await page.waitForTimeout(2200);
  assert.equal(
    await page.getByLabel("Chat Title", { exact: true }).inputValue(),
    "Synthetic private draft",
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: "Check / retry existing request",
        exact: true,
      })
      .isEnabled(),
    true,
  );
  await page
    .getByRole("button", {
      name: "Check / retry existing request",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "Synthetic private draft", exact: true })
    .waitFor();
  await page.getByText("Messages not retained", { exact: true }).waitFor();
  assert.equal(state.privacyKeys[0], state.privacyKeys[1]);
  evidence.push(
    "privacy: pending draft preserved, 0-credit same-key recovery, canonical saved results displayed",
  );
  // A fresh browser session receives credits again; no ghost content enters the saved collection.
  await context.close();
  const ghostContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const ghostPage = await ghostContext.newPage();
  const ghostState = await fixture(ghostPage);
  await ghostPage.goto(`${base}/home`);
  await ghostPage.getByText("Synthetic provider failure").waitFor();
  await openCreate(ghostPage);
  await ghostPage
    .getByRole("button", { name: "Ghost Mode", exact: true })
    .click();
  await ghostPage
    .getByRole("button", { name: "Create Ghost Analysis", exact: true })
    .click();
  await ghostPage
    .getByRole("heading", { name: "Ghost Analysis Results", exact: true })
    .waitFor();
  assert.equal(ghostState.chats.length, 61);
  await ghostPage
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  assert.equal(
    await ghostPage
      .getByRole("heading", { name: "Ghost Analysis Results", exact: true })
      .count(),
    0,
  );
  evidence.push(
    "ghost: transient results render, close removes modal, saved chat list unchanged",
  );
  await ghostContext.close();
  const recoveryContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const recoveryPage = await recoveryContext.newPage();
  const recoveryState = await fixture(recoveryPage);
  recoveryState.failBootstrap = true;
  await recoveryPage.goto(`${base}/home`);
  await recoveryPage
    .getByRole("button", { name: "Retry loading data", exact: true })
    .click();
  await recoveryPage.getByText("Synthetic provider failure").waitFor();
  recoveryState.lostRegular = true;
  await recoveryPage
    .getByRole("button", { name: "Retry Analysis (8 credits)", exact: true })
    .click();
  await recoveryPage
    .getByRole("button", { name: "Check existing analysis", exact: true })
    .first()
    .waitFor();
  await recoveryPage.waitForTimeout(2200);
  assert.equal(
    await recoveryPage
      .getByRole("button", { name: "Check existing analysis", exact: true })
      .first()
      .isEnabled(),
    true,
  );
  await recoveryPage
    .getByRole("button", { name: "Check existing analysis", exact: true })
    .first()
    .click();
  await recoveryPage
    .getByText("Overall energy & chemistry", { exact: true })
    .waitFor();
  assert.equal(recoveryState.regularKeys[0], recoveryState.regularKeys[1]);
  evidence.push(
    "standard: explicit bootstrap retry; lost-response/status recovery at zero credits reuses one key",
  );
  await openCreate(recoveryPage);
  await recoveryPage.evaluate(() =>
    window.dispatchEvent(new Event("chatlyzer:session-expired")),
  );
  await recoveryPage
    .getByRole("heading", { name: "Not authenticated", exact: true })
    .waitFor();
  assert.equal(
    await recoveryPage.getByLabel("Chat Title", { exact: true }).count(),
    0,
  );
  assert.equal(
    await recoveryPage.getByText("Fixture chat 00", { exact: true }).count(),
    0,
  );
  evidence.push(
    "expiry: private dashboard and draft unmount on terminal session event",
  );
  await recoveryContext.close();
  const sandboxContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const sandboxPage = await sandboxContext.newPage();
  const sandboxState = await fixture(sandboxPage);
  sandboxState.credits = 0;
  sandboxState.sandboxAmount = 24;
  await sandboxPage.goto(`${base}/home`);
  await sandboxPage.getByText("Synthetic provider failure").waitFor();
  assert.equal(
    await sandboxPage
      .getByRole("button", { name: "Retry Analysis (8 credits)", exact: true })
      .isEnabled(),
    true,
  );
  await sandboxPage.getByText("24 · test", { exact: true }).waitFor();
  await noOverflow(sandboxPage, "home sandbox 390");
  evidence.push(
    "sandbox: isolated test credits labelled and eligible paid action enabled",
  );
  await sandboxContext.close();
  const deletionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const deletionPage = await deletionContext.newPage(); const deletionState = await fixture(deletionPage);
  await deletionPage.goto(`${base}/delete-account`);
  const deleteButton = deletionPage.getByRole("button", { name: "Delete account permanently", exact: true });
  await deleteButton.waitFor(); assert.equal(await deleteButton.isEnabled(), false);
  await noOverflow(deletionPage, "delete account 390");
  await deletionPage.screenshot({ path: "work/remediation/browser-results/delete-account-390.png", fullPage: true });
  await deletionPage.getByRole("checkbox").check(); assert.equal(await deleteButton.isEnabled(), true);
  await deleteButton.click(); await deletionPage.waitForURL("**/auth/sign-in"); assert.equal(deletionState.deletions, 1);
  evidence.push("deletion: confirmation enables canonical action; successful deletion signs out and redirects");
  await deletionContext.close();
  const legalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const legalPage = await legalContext.newPage();
  for (const [path, heading] of [["privacy", "Privacy Policy"], ["terms", "Terms of Service"]]) {
    await legalPage.goto(`${base}/${path}`);
    await legalPage.getByRole("heading", { name: heading, exact: true }).waitFor();
    await noOverflow(legalPage, `${path} 390`);
    await legalPage.screenshot({ path: `work/remediation/browser-results/${path}-390.png`, fullPage: true });
  }
  evidence.push("public legal pages: privacy and terms render at 390px without horizontal overflow");
  await legalContext.close();
  await fs.writeFile(
    "work/remediation/browser-results/evidence.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
