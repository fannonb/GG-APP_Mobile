const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared packages in the monorepo
config.watchFolders = [monorepoRoot];

// Ensure Metro resolves modules from both the app's and monorepo's node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Prevent duplicate React instances
config.resolver.disableHierarchicalLookup = true;

// Metro defaults to roughly one transformer worker per CPU core. Each worker is
// a separate thread with its own V8 heap, so on a 16-core dev box that is ~15
// heaps competing for whatever RAM the emulator, browser and editor have left.
// When one loses, Metro reports "Jest worker ran out of memory and crashed"
// (Metro transforms via jest-worker) and the bundle fails part-way through.
//
// Bundling is I/O- and cache-bound more than CPU-bound here, so capping this
// costs little wall-clock time and makes the bundler survive a loaded machine.
// Raise it with METRO_MAX_WORKERS=8 on a box with headroom.
config.maxWorkers = Number(process.env.METRO_MAX_WORKERS) || 3;

module.exports = config;
