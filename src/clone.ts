import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const run = promisify(exec);

export type CloneResult = {
  path: string;
  success: boolean;
  error?: string;
};

export type CloneOptions = {
  basePath: string;
  useOrgDirectory: boolean;
  separator: string;
};

/**
 * Parse repository URL to extract org and repo names.
 * Supports: org/repo, https://github.com/org/repo, git@github.com:org/repo.git
 */
export function parseRepositoryUrl(
  url: string
): { org: string; repo: string } | null {
  // SSH format
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { org: sshMatch[1], repo: sshMatch[2] };
  }

  // HTTPS or shorthand
  const match = url.match(
    /^(?:https?:\/\/github\.com\/)?([^/]+)\/([^/]+?)(?:\.git)?$/
  );
  if (!match) return null;

  return { org: match[1], repo: match[2] };
}

/**
 * Check if a directory exists.
 */
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Scan the filesystem to find which numbered slots are already taken.
 * Returns a Set of occupied suffixes (e.g. {1, 2, 5}).
 * Suffix 1 represents the base path (no number).
 */
async function scanOccupiedSlots(
  baseDir: string,
  repoName: string,
  sep: string
): Promise<Set<number>> {
  const occupied = new Set<number>();

  // Check the unnumbered base directory
  if (await dirExists(path.join(baseDir, repoName))) {
    occupied.add(1);
  }

  // Read sibling entries and find numbered variants
  try {
    const entries = await fs.readdir(baseDir);
    const prefix = `${repoName}${sep}`;
    for (const entry of entries) {
      if (entry.startsWith(prefix)) {
        const suffix = entry.slice(prefix.length);
        const num = Number(suffix);
        if (Number.isInteger(num) && num >= 2) {
          occupied.add(num);
        }
      }
    }
  } catch {
    // Parent directory doesn't exist yet — nothing is occupied
  }

  return occupied;
}

/**
 * Build the destination path for a given slot number.
 */
function buildPath(
  baseDir: string,
  repoName: string,
  sep: string,
  slot: number
): string {
  if (slot === 1) return path.join(baseDir, repoName);
  return path.join(baseDir, `${repoName}${sep}${slot}`);
}

/**
 * Determine clone destination paths with smart numbering.
 * Scans the filesystem once, then allocates the next N available slots.
 */
export async function resolveClonePaths(
  org: string,
  repo: string,
  count: number,
  options: CloneOptions
): Promise<string[]> {
  const { basePath, useOrgDirectory, separator } = options;
  const parentDir = useOrgDirectory ? path.join(basePath, org) : basePath;

  const occupied = await scanOccupiedSlots(parentDir, repo, separator);

  const results: string[] = [];
  let slot = 1;
  while (results.length < count) {
    if (!occupied.has(slot)) {
      results.push(buildPath(parentDir, repo, separator, slot));
      occupied.add(slot); // Mark as taken for this batch
    }
    slot++;
  }

  return results;
}

/**
 * Clone repositories in parallel.
 */
export async function cloneRepositories(
  org: string,
  repo: string,
  destinations: string[]
): Promise<CloneResult[]> {
  const tasks = destinations.map(async (dest): Promise<CloneResult> => {
    try {
      await run(`git clone https://github.com/${org}/${repo} "${dest}"`);
      return { path: dest, success: true };
    } catch (err) {
      return {
        path: dest,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return Promise.all(tasks);
}

/**
 * Ensure the parent directory exists before cloning.
 */
export async function ensureParentDirectory(
  org: string,
  options: CloneOptions
): Promise<void> {
  const dir = options.useOrgDirectory
    ? path.join(options.basePath, org)
    : options.basePath;
  await fs.mkdir(dir, { recursive: true });
}
