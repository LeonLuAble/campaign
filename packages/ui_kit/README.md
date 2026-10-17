# ui_kit

Shared Material 3 presentation widgets for the Community Campaign Flutter apps.

- No dependency on `api_client`
- No l10n delegate; pass labels into widgets
- Theme: `AppTheme.light()` + `ThemeExtension<AppTokens>`

## Tests

CI runs platform-independent widget tests and the WCAG contrast unit test:

```sh
flutter analyze
flutter test --exclude-tags golden
```

Golden (pixel) tests under `test/golden/` are tagged `golden` and are for local use. They often differ slightly across macOS vs Linux, so CI excludes them.

Regenerate goldens after intentional visual changes:

```sh
flutter test --update-goldens --tags golden
```
