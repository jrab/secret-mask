# Secret mask

Masks detected secrets as `****` in source mode, Live Preview, and reading
view. Masking starts enabled. Use the shield ribbon button or the "Toggle
masking" command to change it. The choice persists across restarts. Desktop
status text shows whether masking is on; toggling also shows a notice.

## Install

1. In Obsidian, open Settings → Community plugins → Browse. Install and enable
   [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. In BRAT's settings, add the beta plugin repository `jrab/secret-mask`.
3. Enable Secret mask under Community plugins if needed. BRAT downloads the
   release files and can install future updates.

Secret mask is not yet listed in Obsidian's community plugin browser. Start
with a disposable vault and synthetic secrets, and check your screen before
sharing. Desktop, mobile, theme, and popout behavior still need testing in the
actual Obsidian app.

## Privacy and limitations

The plugin scans locally. It sends no network requests, edits no note files,
and stores only the enabled flag. Revealing a note requires explicitly
turning masking off. Moving the cursor onto a mask keeps it masked.

## Detection coverage

Rules cover common OpenAI/Anthropic, GitHub, Slack, AWS access ID, Stripe,
Google API key and JWT formats, private-key blocks, bearer tokens, and values
assigned to labels such as `api_key`, `password`, `client_secret`, and `token`.
Unknown formats and encoded or unlabeled secrets can be missed. Generic labels
can also mask ordinary values. Adjust the local rules in `src/detector.ts` as
you encounter formats you need.

This is a screen-sharing aid. Stored notes, clipboard content copied from the
editor, search results, filenames, properties panels, tooltips from other
plugins, exports, and other applications can expose the original text. Images
and canvases are outside its scope. A resource URL can load before reading-view
processing. Other plugins can change the rendered DOM afterward. Inspect the
visible note before sharing and keep credentials out of notes when possible.

## Build and try it

Use Node.js 24 or newer:

```sh
npm install
npm test
npm run build
```

Commit the generated package lock. `npm run dev` watches and rebuilds.
`build` checks TypeScript and the community scanner's ESLint rules first.
The app supplies Obsidian and CodeMirror; they are excluded from the bundle.

Use a disposable test vault with synthetic values. Copy `main.js`,
`manifest.json`, and `styles.css` into
`<test-vault>/<config-directory>/plugins/secret-mask/`, then enable Secret mask under
Community plugins. The config directory defaults to `.obsidian` but can be
changed. The generator never installs into a real vault.

Before screen sharing, test:

- Open synthetic assignments, prefixed tokens, and a multiline private-key
  block in source mode, Live Preview, and reading view, including code fences.
- Paste and edit a token, switch notes, split panes, scroll, and open a popout.
- Leave existing notes open, restart Obsidian, and confirm masking applies to
  those notes and later edits as well as newly created notes.
- Toggle masking using the keyboard command palette and the ribbon. Confirm
  the status, reload behavior, and restoration after disabling the plugin.
- Confirm the file contents remain unchanged. Check editor copy/paste so you
  understand that the clipboard can contain the original secret.
- Repeat on mobile and with your themes and other plugins enabled.

Automated tests cover detection, rendered text, and editor decorations. They
cannot replace checking rendering in the actual Obsidian app.

## Distribution

See [Releases and installation](RELEASING.md) to publish GitHub Releases with
the included workflow and install through BRAT without copying files. Direct
installation from Obsidian's community plugin browser requires a dedicated
public repository and approval at community.obsidian.md.
