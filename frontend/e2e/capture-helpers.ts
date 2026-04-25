import type { Page } from "@playwright/test";

export type ConsoleEntry = { type: string; text: string; location?: string };
export type NetworkFailure = { url: string; failure: string };

export async function captureConsoleAndNetwork(page: Page) {
  const consoleEntries: ConsoleEntry[] = [];
  const networkFailures: NetworkFailure[] = [];

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location().url;
    if (type === "error" || type === "warning") {
      consoleEntries.push({ type, text, location });
    }
  });

  page.on("requestfailed", (request) => {
    networkFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? "Unknown failure",
    });
  });

  return {
    getConsoleEntries: () => [...consoleEntries],
    getNetworkFailures: () => [...networkFailures],
    toJSON: () => ({ consoleEntries, networkFailures }),
  };
}
