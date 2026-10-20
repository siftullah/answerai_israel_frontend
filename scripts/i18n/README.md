# UI translations

The portal ships in English, Hebrew, Arabic and Russian. English is the source of truth:
every user-facing string lives in `messages/en/<namespace>.json` (one namespace per
area of the app) and components read it with next-intl (`useTranslations("<namespace>")`;
non-React modules use `rt()` / `labelMap()` from `lib/i18n`). The active language is a
cookie (`NEXT_LOCALE`) set by the language picker; `i18n/request.ts` resolves it, and a visitor
without the cookie gets Hebrew (`defaultLocale` in `i18n/config.ts`; the browser's Accept-Language
is not consulted).

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
  keeps terminology consistent (rebuild it with `translate.py glossary [--locales ar]` only if the
  product vocabulary or a language's register changes, then `run --force`; `--locales` leaves the
  other languages' glossary entries untouched).
- Every result is validated: placeholders, `<tags>`, plural/select structure must match the
  English, Russian plural blocks must carry `one`, `few`, `many` and `other`, Arabic plurals must
  carry all six CLDR categories, and the Arabic register guard below must pass; rejected strings
  are retried once with the complaint and otherwise reported.
- `python3 -I scripts/i18n/translate.py check` re-validates the committed files with the same
  rules.
- Arabic plural branches use `{count}` instead of ICU `#` so digits stay Latin (the script
  rewrites them).

## Language registers

The register of each language is the `style` note in `LANG` in `translate.py`; the glossary and
every batch are generated from it.

- **Hebrew**: modern Israeli Hebrew, the register of Israeli SaaS UIs.
- **Arabic**: Palestinian colloquial Arabic (Levantine, as spoken in Jerusalem, Ramallah and the
  Arab communities inside Israel) — not Modern Standard Arabic. Dialect function words and verbs
  (شو، هاد/هاي، بدك، وين، ليش، هلأ، كمان، عشان/منشان، في/ما في، مش، عم + verb, بـ-present), no
  tanwin, no فصحى verb morphology, but still a concise UI register: buttons and labels are short
  noun phrases or bare imperatives, not chatty sentences. Brand names, product/technical terms,
  شيكل/₪, placeholders, ICU structure and Latin digits are unchanged.

  **Register guard**: tanwin (ً ٌ ٍ) only appears in فصحى morphology, so `translate.py` rejects
  any Arabic value containing it (the batch is retried with the complaint) and `translate.py check`
  reports every committed value that still has one as `BAD … tanwin (فصحى register)`. Latin brand
  and technical terms never carry tanwin, so there is no allow-list. If a legitimate exception ever
  turns up, add it to `REGISTER_CHECKS["ar"]` in `translate.py` rather than editing the Arabic
  by hand — Arabic and Hebrew values are never hand-written.

## Checking keys in code

```bash
python3 -I scripts/i18n/check_keys.py components lib hooks app --ns agents
```

Reports `t("…")` keys that are missing from `messages/en` and, with `--ns`, keys in that
namespace no scanned file uses. Dynamic keys (template literals) are listed, not checked.
