# Releases and installation

The public plugin repository is
[jrab/secret-mask](https://github.com/jrab/secret-mask). Its root manifest and
GitHub Release assets support BRAT installation. Listing in the community
plugin directory requires a separate submission and review.

## Publish the first release

1. Install dependencies with `npm install` and commit `package-lock.json`.
   Keep the lockfile in Git so the workflow can use `npm ci`.
2. Run `npm run release:check`, `npm test`, and `npm run build`. Complete the
   manual Obsidian checks in README.md before distributing.
3. Commit the source, manifest, version history, lockfile, and
   `.github/workflows/release.yml` to your dedicated repository. Leave
   `main.js`, vaults, and plugin `data.json` out of Git.
4. Push the reviewed commit, then create and push a tag matching the manifest
   version exactly. The initial version is `0.1.0`, with no `v` prefix:

   ```sh
   git tag 0.1.0
   git push origin 0.1.0
   ```

The release workflow checks version consistency, runs tests, checks TypeScript
and ESLint, and builds the plugin. It then creates a published GitHub Release
with separate `main.js`, `manifest.json`, and optional `styles.css` assets.
Public repositories also receive GitHub build provenance attestations. The
workflow uses GitHub's automatic token; no personal access token is needed.

Check the Actions run and release assets before installing. Downloading
GitHub's source archive does not include the compiled plugin. If validation or
builds fail, no release is created. Fix the source and use a new version and
tag. For a transient failure, rerun the failed workflow. Existing releases
are never overwritten automatically.

## Install through BRAT

Until Secret mask is approved for the community plugin directory, use
[BRAT](https://github.com/TfTHacker/obsidian42-brat) to install and update it
without copying build files:

1. In Obsidian, open Settings → Community plugins → Browse. Install and enable
   BRAT.
2. Open BRAT's settings, choose to add a beta plugin, and enter the dedicated
   plugin repository as `jrab/secret-mask` or its GitHub URL.
3. Add the plugin, then enable Secret mask under Community plugins if BRAT has
   not enabled it for you. Use BRAT's update controls for later releases.

The repository needs a published release with the assets above. These steps
assume a public repository. Private repositories require BRAT's private
repository authentication setup on each device. Never put a GitHub token in
plugin source, a shared vault, or release assets.

## Install from the community plugin browser

A GitHub Release alone does not add Secret mask to Obsidian's plugin browser.
Complete desktop, mobile, keyboard, theme, and popout checks, then submit the
dedicated public repository for review at
[community.obsidian.md](https://community.obsidian.md). Keep the manifest,
README, and license at the repository root and keep default-branch metadata
current.

After approval, install Secret mask directly from Settings → Community plugins →
Browse and use Obsidian's normal update controls. When migrating from BRAT,
remove the repository from BRAT's update list so only one updater manages it.

## Publish updates

Update `package.json` and its lockfile together, for example with
`npm version patch --no-git-tag-version`. Set `manifest.json` to the same
version and add that version's `minAppVersion` to `versions.json`, preserving
older entries. Run the checks, review and commit the changes, then push the
commit and its matching version tag. Each release must use a new tag.

Pushing a version tag publishes a release through GitHub Actions. It does not
submit the plugin to the community directory or install it into a vault.
