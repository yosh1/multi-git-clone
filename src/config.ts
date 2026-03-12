import fs from "fs/promises";
import path from "path";
import type { CloneOptions } from "./clone.js";

const CONFIG_FILE = ".mgcrc";

type ConfigFile = Partial<{
  basePath: string;
  useOrgDirectory: boolean;
  separator: string;
}>;

const DEFAULTS: CloneOptions = {
  basePath: "~/git/github.com",
  useOrgDirectory: true,
  separator: "-",
};

function resolveHome(p: string): string {
  return p.replace(/^~/, process.env.HOME ?? "");
}

async function loadConfigFile(): Promise<ConfigFile> {
  const configPath = path.join(process.env.HOME ?? "", CONFIG_FILE);
  try {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content) as ConfigFile;
  } catch {
    return {};
  }
}

export type CliFlags = {
  basePath?: string;
  separator?: string;
  flat?: boolean;
};

/**
 * Merge config: CLI flags > config file > defaults
 */
export async function resolveConfig(flags: CliFlags): Promise<CloneOptions> {
  const file = await loadConfigFile();

  const basePath = resolveHome(
    flags.basePath ?? file.basePath ?? DEFAULTS.basePath
  );
  const separator = flags.separator ?? file.separator ?? DEFAULTS.separator;
  const useOrgDirectory = flags.flat
    ? false
    : (file.useOrgDirectory ?? DEFAULTS.useOrgDirectory);

  return { basePath, useOrgDirectory, separator };
}
