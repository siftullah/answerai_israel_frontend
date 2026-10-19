# UI translations

The portal ships in English, Hebrew, Arabic and Russian. English is the source of truth:
every user-facing string lives in `messages/en/<namespace>.json` (one namespace per
area of the app) and components read it with next-intl (`useTranslations("<namespace>")`;
non-React modules use `rt()` / `labelMap()` from `lib/i18n`). The active language is a
cookie (`NEXT_LOCALE`) set by the language picker; `i18n/request.ts` resolves it.

`messages/he/*.json`, `messages/ar/*.json` and `messages/ru/*.json` are generated — do not hand-edit them
(edit the English, re-run the translator). Keys missing in a translation fall back to
English at runtime (`i18n/messages.ts`).

## Translating after a copy change

```bash
OPENAI_API_KEY=… python3 -I scripts/i18n/translate.py run
```

- Only new or changed English strings are sent (the translation memory in `cache/` remembers
  the English each translation was made from). `--ns a,b` limits namespaces, `--locales he,ar,ru`
  (the default) picks languages, `--force` redoes all.
- Model: `gpt-6.1-sol` with medium reasoning, batched with a strict JSON schema; `glossary.json`
  keeps terminology consistent (rebuild it with `translate.py glossary` only if the product
  vocabulary changes, then `run --force`; `glossary --locales ru` rebuilds one language and
  keeps the others).
- Every result is validated: placeholders, `<tags>`, plural/select structure must match the
  English, and Russian plural blocks must carry `one`, `few`, `many` and `other`; rejected
  strings are retried once and otherwise reported.
- `python3 -I scripts/i18n/translate.py check` re-validates the committed files.
- Arabic plural branches use `{count}` instead of ICU `#` so digits stay Latin (the script
  rewrites them).

## Checking keys in code

```bash
python3 -I scripts/i18n/check_keys.py components lib hooks app --ns agents
```

Reports `t("…")` keys that are missing from `messages/en` and, with `--ns`, keys in that
namespace no scanned file uses. Dynamic keys (template literals) are listed, not checked.
