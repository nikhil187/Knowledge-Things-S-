import * as fs from "fs";
import * as path from "path";

const PID_FILE = path.join(__dirname, "..", ".e2e-backend-pid");

export default async function globalTeardown(): Promise<void> {
  try {
    if (!fs.existsSync(PID_FILE)) return;
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8"), 10);
    fs.unlinkSync(PID_FILE);
    if (pid && !Number.isNaN(pid)) {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // Ignore teardown errors
  }
}
