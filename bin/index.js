#!/usr/bin/env node

if (process.env.PORT === undefined) {
  process.env.PORT = "5858";
}

const DEFAULT_PORT = Number(process.env.PORT ?? "5858");
const LOCALHOST = `http://localhost:${DEFAULT_PORT}`;
const AUTO_OPEN_DISABLED = [
  process.env.CC_SEARCH_NO_AUTO_OPEN,
  process.env.NO_AUTO_OPEN,
  process.env.NO_AUTO_BROWSER,
]
  .filter((value) => value !== undefined)
  .map((value) => value?.toLowerCase())
  .some((value) => value === "1" || value === "true" || value === "yes");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isServerReady = async (url) => {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok || response.status === 200;
  } catch (error) {
    if (
      error?.code === "ECONNREFUSED" ||
      error?.code === "ECONNRESET" ||
      error?.name === "FetchError"
    ) {
      return false;
    }
    throw error;
  }
};

const waitForServer = async (url, attempts = 40, interval = 250) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ready = await isServerReady(url).catch(() => false);
    if (ready) {
      return true;
    }
    await wait(interval);
  }
  return false;
};

const openBrowser = async (url) => {
  if (AUTO_OPEN_DISABLED) {
    return;
  }

  const ready = await waitForServer(url).catch(() => false);
  if (!ready) {
    console.warn(
      `[cc-search] Server readiness check failed, skipping auto-open (${url})`,
    );
    return;
  }

  try {
    const { default: open } = await import("open");
    await open(url, { wait: false });
    console.log(`[cc-search] Browser opened: ${url}`);
  } catch (error) {
    console.warn(
      `[cc-search] Failed to open browser: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

(async () => {
  await import("./standalone/server.js").catch((error) => {
    console.error(error);
    process.exit(1);
  });

  void openBrowser(LOCALHOST);
})();
