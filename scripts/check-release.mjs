import { readFileSync } from 'node:fs';

// Obsidian release tags are stable manifest versions, without a v prefix.
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const read = name => JSON.parse(readFileSync(name, 'utf8'));

try {
  const manifest = read('manifest.json');
  const pkg = read('package.json');
  const versions = read('versions.json');
  const [tag, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Usage: npm run release:check -- [tag]');
  if (!stableVersion.test(manifest.version)) throw new Error('Manifest version must be a stable x.y.z version.');
  if (!stableVersion.test(manifest.minAppVersion)) throw new Error('Minimum app version must be an x.y.z version.');
  if (pkg.version !== manifest.version) throw new Error('Package and manifest versions must match.');
  if (versions[manifest.version] !== manifest.minAppVersion) {
    throw new Error('versions.json must map the manifest version to its minimum app version.');
  }
  if (tag !== undefined && tag !== manifest.version) {
    throw new Error(`Release tag must be ${manifest.version}, without a v prefix.`);
  }
  process.stdout.write(`Release metadata valid for ${manifest.version}.\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
