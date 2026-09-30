The maintained frontend regressions run with `npm test` on Node 22. They use real Zustand state with mocked local network responses, controlled hook state for privacy/draft/request recovery, and static React rendering for lifecycle and accessible controls.

The browser smoke uses the built production UI with synthetic API fixtures. It covers 61-record traversal, failed and lost-response retries, cookie-session invalidation, privacy/ghost lifecycles, deletion, keyboard selection and resize, and 390/1440-pixel layouts. Every app API request is intercepted with synthetic data; the smoke does not submit authentication credentials, conversations, or purchases to external providers or mutate real user records. It does not establish live provider acceptance.

Start a locally built app with synthetic configuration and a disposable test database, then run:

```sh
npm install --prefix work/remediation/browser --no-audit --no-fund playwright
PLAYWRIGHT_MODULE_PATH="file://$PWD/work/remediation/browser/node_modules/playwright/index.mjs" node src/frontend/__tests__/browser-smoke.mjs
```

The default app URL is `http://127.0.0.1:3015`; override it with `BROWSER_TEST_URL`. On macOS it uses installed Google Chrome; set `CHROME_EXECUTABLE` to choose another installed Chromium browser. On other platforms, install Playwright's Chromium or supply an executable. Evidence and viewport screenshots are written under ignored `work/remediation/browser-results`; screenshots need visual inspection as well as width assertions. Stop temporary app/database services after verification.
