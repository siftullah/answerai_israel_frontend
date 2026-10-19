<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI text is translated

Every user-facing string goes through next-intl: add it to `messages/en/<area>.json` and read it
with `useTranslations("<area>")` (or `rt()` from `lib/i18n/runtime` outside React); never hardcode
English in components. Use ICU plurals for counts and logical Tailwind classes (`ms-`, `pe-`,
`start-`, `text-end`) — Hebrew and Arabic render right-to-left (Russian is left-to-right).
Hebrew/Arabic/Russian files are generated: see `scripts/i18n/README.md`.
