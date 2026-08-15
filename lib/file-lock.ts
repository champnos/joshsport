import fs from "fs/promises";
import path from "path";

const LOCK_DIR = path.join(process.cwd(), "data", ".locks");
const STALE_LOCK_MS = 10_000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withFileLock<T>(name: string, callback: () => Promise<T>) {
  await fs.mkdir(LOCK_DIR, { recursive: true });
  const lockPath = path.join(LOCK_DIR, `${name}.lock`);

  let handle: Awaited<ReturnType<typeof fs.open>> | null = null;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      handle = await fs.open(lockPath, "wx");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      try {
        const stats = await fs.stat(lockPath);
        if (Date.now() - stats.mtimeMs > STALE_LOCK_MS) {
          await fs.unlink(lockPath);
          continue;
        }
      } catch {
        continue;
      }

      await sleep(50);
    }
  }

  if (!handle) {
    throw new Error(`Could not acquire lock for ${name}.`);
  }

  try {
    return await callback();
  } finally {
    await handle.close();
    await fs.unlink(lockPath).catch(() => undefined);
  }
}
