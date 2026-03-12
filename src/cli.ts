#!/usr/bin/env node

import { parseArgs } from "util";
import {
  parseRepositoryUrl,
  resolveClonePaths,
  cloneRepositories,
  ensureParentDirectory,
} from "./clone.js";
import { resolveConfig, type CliFlags } from "./config.js";

const HELP = `
  multi-git-clone (mgc) - Clone a repo to multiple folders in parallel

  Usage:
    mgc <repo> [count]  Clone <repo> to [count] folders (default: 1)

  Arguments:
    <repo>   GitHub repository (org/repo, URL, or git@github.com:org/repo)
    [count]  Number of clones to create (1-10, default: 1)

  Options:
    --base <path>    Base directory for clones (default: ~/git/github.com)
    --sep <char>     Numbering separator: - _ . (default: -)
    --flat           Skip org subdirectory (clone to base/repo instead of base/org/repo)
    --dry-run        Show clone paths without executing
    -h, --help       Show this help
    -v, --version    Show version

  Config:
    Place a ~/.mgcrc file (JSON) to set defaults:
    {
      "basePath": "~/git/github.com",
      "useOrgDirectory": true,
      "separator": "-"
    }

  Examples:
    mgc vercel/next.js           # Clone once
    mgc vercel/next.js 3         # Clone 3 copies in parallel
    mgc vercel/next.js 3 --flat  # Without org directory
    mgc vercel/next.js --dry-run # Preview clone paths
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      base: { type: "string" },
      sep: { type: "string" },
      flat: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (values.version) {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version: string };
    console.log(pkg.version);
    process.exit(0);
  }

  const [repoArg, countArg] = positionals;

  if (!repoArg) {
    console.error("Error: Repository is required.\n");
    console.log(HELP);
    process.exit(1);
  }

  const parsed = parseRepositoryUrl(repoArg);
  if (!parsed) {
    console.error(
      "Error: Invalid repository format. Use org/repo or full GitHub URL.\n"
    );
    process.exit(1);
  }

  const count = countArg ? parseInt(countArg, 10) : 1;
  if (isNaN(count) || count < 1 || count > 10) {
    console.error("Error: Clone count must be between 1 and 10.\n");
    process.exit(1);
  }

  const flags: CliFlags = {
    basePath: values.base,
    separator: values.sep,
    flat: values.flat,
  };

  const options = await resolveConfig(flags);
  const { org, repo } = parsed;

  const clonePaths = await resolveClonePaths(org, repo, count, options);

  // Dry run: show paths and exit
  if (values["dry-run"]) {
    console.log("Clone paths (dry run):\n");
    clonePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log();
    process.exit(0);
  }

  // Show plan
  console.log(
    `Cloning ${org}/${repo} to ${count} ${count === 1 ? "folder" : "folders"}...\n`
  );
  clonePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log();

  // Ensure parent directory
  await ensureParentDirectory(org, options);

  // Clone in parallel
  const results = await cloneRepositories(org, repo, clonePaths);

  // Report results
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  if (successes.length > 0) {
    console.log(`\u2713 ${successes.length} clone(s) completed successfully`);
  }

  if (failures.length > 0) {
    console.error(`\u2717 ${failures.length} clone(s) failed:`);
    failures.forEach((r) => {
      console.error(`  - ${r.path}: ${r.error}`);
    });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
