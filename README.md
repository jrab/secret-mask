# Secret mask

Secret mask replaces detected credentials with `****` in Obsidian's source
mode, Live Preview, and reading view. It helps hide credentials while screen
sharing. Detection runs locally using rules. It does not use AI or send note
contents to a server.

Masking changes the display. Your note files still contain the original text.
It does not encrypt, delete, or sanitize stored credentials.

## Install with BRAT

1. In Obsidian, open Settings → Community plugins → Browse. Install and enable
   [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Open BRAT's settings and add the beta plugin repository `jrab/secret-mask`.
3. Enable Secret mask under Community plugins if BRAT has not enabled it.
4. Test with the fake values below in a disposable note before screen sharing.

BRAT downloads the built plugin files. You do not need Node.js, a local build,
or manual file copying. Secret mask has not been approved for Obsidian's
community plugin browser, so install it through BRAT for now.

To update, use BRAT's check-for-updates controls and confirm the installed
Secret mask version in Community plugins. Restart Obsidian after updating if
an existing pane still shows the previous behavior. BRAT can also manage
updates automatically according to its settings.

## Turn masking on or off

Masking starts enabled on the first installation. Use either of these controls:

- Open the command palette and choose `Secret mask: Toggle masking`.
- Click the shield icon in the ribbon.

The toggle applies across open notes. On desktop, the status bar shows
`Secret masking: on` or `Secret masking: off`. A notice also appears when you
toggle it. Moving the cursor onto a mask does not reveal the credential.

The enabled flag persists across restarts. If you turn masking off, restarting
Obsidian keeps it off. Turn it back on explicitly before sharing your screen.
There are no configurable detection rules in the settings UI yet.

## What gets masked

The detector combines credential labels, known token prefixes, authorization
headers, and private-key blocks. A match is replaced with four stars regardless
of the original length. It recognizes token shapes; it does not check whether
a credential is valid or active.

### Values next to credential labels

A recognizable label followed by `=` or `:` causes its value to be masked.
Labels are case-insensitive. Short fake values are masked too.

| Original text | Displayed text |
| --- | --- |
| `jev_key=sjejej` | `jev_key=****` |
| `JEV_KEY: synthetic-value` | `JEV_KEY: ****` |
| `service-key=synthetic-value` | `service-key=****` |
| `api_key=synthetic-value` | `api_key=****` |
| `export OPENAI_API_KEY="synthetic-value"` | `export OPENAI_API_KEY="****"` |
| `{"jev_key": "synthetic-value"}` | `{"jev_key": "****"}` |
| `password: synthetic-value` | `password: ****` |
| `client_secret=synthetic-value` | `client_secret=****` |

Covered labels include `apikey`, `api_key`, `api-key`, `access_key`, `secret`,
`secret_access_key`, `token`, `password`, `passwd`, `client_secret`, and
`authorization`. Service prefixes such as `OPENAI_API_KEY` and
`AWS_SECRET_ACCESS_KEY` are supported. Names ending in `_key` or `-key`, such
as `jev_key` and `my_service_key`, are also supported.

These are text rules, not an environment-file, JSON, or YAML parser. The value
must begin on the same line as its label. Assignment rules handle a single
token value and stop at whitespace or a delimiter such as a quote, comma,
semicolon, or backtick. They do not fully mask multiword passphrases or
structured credential objects. A generic label can also hide an ordinary
value, for example `cache_key=homepage`.

### Tokens without a label

These formats can be masked when pasted on their own, in prose, or in a code
block. No `api_key=` assignment is needed.

| Format | Recognition rule |
| --- | --- |
| `apikey_…` | At least 16 letters, digits, underscores, or hyphens after the prefix. |
| Resend `re_…` | At least 16 letters, digits, underscores, or hyphens after the prefix. |
| OpenAI/Anthropic `sk-…` | Token body of at least 16 supported characters; includes `sk-proj-…` and `sk-ant-api03-…` shapes. |
| GitHub | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, or `github_pat_`, with a body of at least 20 characters. |
| Slack | `xoxb-`, `xoxa-`, `xoxp-`, `xoxr-`, or `xoxs-`, with a body of at least 10 supported characters. |
| AWS access-key ID | `AKIA` or `ASIA` followed by exactly 16 uppercase letters or digits. |
| Stripe | `sk_live_`, `sk_test_`, `rk_live_`, or `rk_test_`, with a body of at least 16 letters or digits. |
| Google API key | `AIza` followed by at least 20 supported characters. |
| JWT | Three nonempty base64url-shaped segments separated by dots, beginning with `eyJ`. |
| Bearer token | `Bearer` followed by a token of at least 8 supported characters. |
| Private-key block | A `-----BEGIN …PRIVATE KEY-----` block, including its contents and end marker. |

Standalone provider prefixes are case-sensitive. The `Bearer` label is
case-insensitive. An incomplete private-key block is masked from its begin
marker through the rest of that text region.

The detector does not estimate randomness or recognize every provider's
credentials. An unfamiliar opaque string such as `sjejej` remains visible on
its own. The same string in `jev_key=sjejej` is masked because its label gives
it a recognizable context. Short prefix lookalikes such as `re_member` and
`apikey_config` stay visible.

## How it works in a note

In source mode and Live Preview, a CodeMirror extension scans the open document
when it attaches and whenever the text changes. It replaces matched ranges
with display widgets. Existing notes, newly created notes, and subsequent
pastes use the same detector. Editors restored during startup are refreshed
once the workspace layout is ready.

In reading view, a Markdown postprocessor masks rendered text, including
values split across inline formatting. It also masks detected credentials in
`title`, `aria-label`, and `alt` attributes, and suppresses matching `href` and
`src` attributes while masking is on. Turning masking off restores the original
rendered content and attributes.

The plugin processes open editors and rendered Markdown. It does not run a
vault-wide rewrite or scan your entire disk. It stores only the enabled flag
in its plugin `data.json`; detected matches and note contents are not saved or
logged by the plugin.

## Try it with fake values

Paste this into a disposable note:

```text
jev_key=sjejej
apikey_SyntheticExampleToken123456
re_SyntheticExampleToken123456
```

With masking enabled, the visible result should be:

```text
jev_key=****
****
****
```

Check source mode, Live Preview, and reading view. Edit a value, paste another
one, switch to an existing note, and try a split pane. Toggle masking off to
confirm the original text is still there, then turn it back on. Leave the note
open, restart Obsidian, and check that masking remains active.

## Limits when sharing your screen

- The saved note retains the original credentials. Editor copying can copy
  those original credentials, and exports can include them.
- Search results, filenames, Properties panels, other plugins' tooltips,
  images, canvases, and other applications are outside this plugin's coverage.
- Unknown token formats, unlabeled opaque strings, encoded values, multiword
  passphrases, and structured credentials can be missed. Detection is not a
  guarantee that every credential is hidden.
- Reading-view links and resources may load before postprocessing. Another
  plugin can change the rendered DOM after masking has run.
- Desktop, mobile, themes, and popouts still need testing in the actual
  Obsidian app. Automated tests use CodeMirror and a simulated DOM.

Inspect the visible screen before sharing. Keep credentials out of notes when
possible. Disable Secret mask through Community plugins to restore normal
display; your original note contents remain intact.

## Troubleshooting

If one of the fake examples above stays visible:

1. In BRAT, check for updates. These examples require Secret mask `0.1.2` or
   newer.
2. Confirm Secret mask is enabled in Community plugins and that masking is on.
   The saved toggle may be off from an earlier session.
3. Restart Obsidian to reload the installed build and restored editor panes.
4. Test in the note body. A Properties panel or search result uses a different
   interface and is not covered.
5. Compare the value with the documented label and prefix rules. Unfamiliar
   bare tokens require an additional detection rule.

When reporting a missed format, use an invented value that preserves its
prefix, separators, length, and surrounding label. Never post a real credential.

## Development and releases

Use Node.js 24 or newer. Clone the repository, then run:

```sh
npm ci
npm test
npm run build
npm run dev
```

`build` checks TypeScript and the Obsidian ESLint rules with no warnings before
bundling. `dev` watches and rebuilds. Obsidian and CodeMirror are supplied by the
app and excluded from the release bundle.

For a local build, copy `main.js`, `manifest.json`, and `styles.css` into
`<test-vault>/<config-directory>/plugins/secret-mask/`. The config directory
defaults to `.obsidian`. Use a disposable vault; preserve existing settings and
back up an installed copy before replacing it.

Tests cover the detector, overlapping matches, inline formatting, attributes,
editor display, edits, toggling, restoration, and startup with existing notes.
Repeat the fake-value checks above in the actual app, on mobile, with your
themes, and in popout windows before relying on a build during screen sharing.

See [Releases and installation](RELEASING.md) for release publishing and
community directory submission. See [Changes](changes.md) for release history.
