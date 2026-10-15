# Changes

## 2026-10-15

- Added detection for service labels ending in `_key` or `-key`, bare
  `apikey_` tokens, and Resend `re_` tokens in 0.1.2. Added regressions for the
  reported fake values in editors and reading view, plus a detailed usage,
  coverage, limits, and troubleshooting guide in the README.
- Fixed masking in notes restored before workspace startup completes. Existing
  editors now refresh when the layout is ready, including split panes and later
  edits. Added a regression test using real CodeMirror editors.
- Added Secret mask 0.1.0 to hide detected secrets in source mode, Live Preview,
  and reading view, with a toggle that persists across restarts.
- Added tested GitHub release packaging, version validation, build provenance,
  and installation through BRAT.
