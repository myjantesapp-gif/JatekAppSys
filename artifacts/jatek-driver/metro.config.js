const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ignoredDirs = [
  path.resolve(workspaceRoot, ".local"),
  path.resolve(workspaceRoot, ".git"),
  path.resolve(workspaceRoot, "dist"),
  path.resolve(workspaceRoot, "build"),
];
config.resolver.blockList = [
  ...ignoredDirs.map((d) => new RegExp(`^${escapeRegExp(d)}(/.*)?$`)),
  // Exclude Expo postinstall temp dirs that pnpm creates then removes
  /_tmp_\d+/,
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
