/**
 * The shape of a next-intl translator function, for library code that gets
 * handed one (validation schema factories, catalog label resolvers) without
 * depending on React. Values are ICU placeholders: `{count}`, `{name}`.
 * The value type matches next-intl's `TranslationValues`, so a
 * `useTranslations()` / `getTranslations()` result is assignable to it.
 */
export type Translator = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;
