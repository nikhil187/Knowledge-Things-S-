import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BACKEND_PORT = process.env.BACKEND_PORT ?? "3001";
const HEALTH_URL = `http://localhost:${BACKEND_PORT}/health`;
const PID_FILE = path.join(__dirname, "..", ".e2e-backend-pid");

async function waitForHealth(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return true;
    } catch {
      // Backend not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startBackend(): Promise<ChildProcess | null> {
  const backendDir = path.join(__dirname, "..", "..", "backend");
  if (!fs.existsSync(path.join(backendDir, "package.json"))) {
    throw new Error(`Backend not found at ${backendDir}. Ensure backend/ exists.`);
  }

  const child = spawn("npm", ["run", "dev"], {
    cwd: backendDir,
    stdio: "pipe",
    shell: true,
    env: { ...process.env, PORT: BACKEND_PORT },
  });

  child.stderr?.on("data", (d) => process.stderr.write(d));
  child.stdout?.on("data", (d) => process.stdout.write(d));

  return child;
}

export default async function globalSetup(): Promise<void> {
  // Quick check: if backend already running, skip
  if (await waitForHealth(3000)) {
    return;
  }

  // Start backend and wait for health
  const child = await startBackend();
  if (!child || !child.pid) {
    throw new Error("Failed to spawn backend process.");
  }

  fs.writeFileSync(PID_FILE, String(child.pid), "utf8");

  if (!(await waitForHealth(30_000))) {
    child.kill("SIGTERM");
    fs.unlinkSync(PID_FILE);
    throw new Error(
      `Backend failed to start on port ${BACKEND_PORT}. ` +
        `Run manually: cd backend && npm run dev`
    );
  }
}
