#!/usr/bin/env python3
"""Translate messages/en/*.json into Hebrew, Arabic and Russian with OpenAI (Responses API).

Needs OPENAI_API_KEY in the environment (or in scripts/i18n/.env, which git ignores).
Run with `python3 -I scripts/i18n/translate.py …` from the repo root.

Usage:
  translate.py glossary [--locales ru]       # build glossary.json (one call per locale; others kept)
  translate.py run [--ns a,b] [--locales he,ar,ru] [--force] [--batch 50] [--workers 6]
  translate.py check [--locales he,ar,ru]    # re-validate placeholders, plural categories and
                                             # the Arabic register (no tanwin) vs en

Incremental: cache/<locale>.json remembers the English source each translation was
made from; only new or changed strings are sent. Output is written straight into
messages/<locale>/<ns>.json (nested like the English file).
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CACHE_DIR = os.path.join(HERE, "cache")
GLOSSARY_PATH = os.path.join(HERE, "glossary.json")
MODEL = "gpt-6.1-sol"
EFFORT = "medium"

LANG = {
    "he": {
        "name": "Hebrew",
        "style": (
            "Modern Israeli Hebrew for a business SaaS web app, the register used in the Hebrew UIs of "
            "Google, Microsoft and Israeli fintech/CRM products. Concise. Prefer gender-neutral phrasing "
            "where it reads naturally: verbal nouns for buttons and actions (שמירה, ביטול, מחיקה, הוספה), "
            "plural or neutral forms for instructions (בחרו, הזינו) rather than masculine singular; "
            "second-person masculine singular only where neutral phrasing would be awkward. No niqqud. "
            "Use standard Israeli software terminology (אימייל, סיסמה, הגדרות, חשבונית, הצעת מחיר, ליד/לידים). "
            "Currency is the Israeli shekel (₪); the digits and the ₪ symbol are inserted by code."
        ),
        "plural": "Hebrew ICU plural categories: use `one`, `two` and `other` (add `many` only if genuinely needed).",
    },
    "ar": {
        "name": "Arabic",
        "style": (
            "Palestinian colloquial Arabic (اللهجة الفلسطينية — the Levantine dialect spoken in Jerusalem, Ramallah "
            "and the Arab communities inside Israel), written the way a local app, a business WhatsApp message or a "
            "support chat is written. NOT Modern Standard Arabic (فصحى): no فصحى function words, no فصحى verb "
            "morphology (no لم/لن/سوف/ليس/لا يوجد, no dual or case endings), no tanwin at all (ً ٌ ٍ — write شكرا, "
            "حاليا, مثلا, not شكرًا). Dialect forms throughout: شو (not ماذا/ما), هاد/هاي/هدول (not هذا/هذه/هؤلاء), "
            "بدك (not تريد), كيف, وين (not أين), ليش (not لماذا), هلأ (not الآن), كمان (not أيضا), عشان/منشان (not "
            "من أجل/لكي), في/ما في (not يوجد/لا يوجد), مش (not ليس/غير), ما + verb for negation, بـ-prefixed present "
            "(بيرد, بتقدر, منقدر), عم + verb for something in progress (عم يحمّل…, عم نبعت…), شغّال for "
            "working/running/active, خلص for done, and everyday verbs (حط, شيل, بعت, طلّع, خلّي, جرّب, دخّل, ضيف, "
            "اختار). Still a concise, professional software UI — not chatty sentences: buttons and labels are short "
            "noun phrases or bare imperatives (احفظ, الغي, احذف, ضيف, ابعت, جرّب كمان مرة, رجوع), table headers and "
            "badges are single nouns, instructions address the user in the masculine singular (دخّل, اختار, حط). "
            "Keep the product/technical vocabulary Palestinians also use in dialect (إعدادات, فاتورة, عرض سعر, حساب, "
            "إيميل, كلمة السر, رقم, تقويم, موعد, حملة, مكالمة, تحويل, تسجيل الدخول) and the regional words (شيكل for "
            "the currency, تلفون/جوّال/موبايل for phones, موعد for appointment); avoid Gulf or Egyptian words (عايز, "
            "إزاي, دلوقتي, ابغى). Brand and product names (AnswerAI, ElevenLabs, Twilio, Stripe, WhatsApp, Google, "
            "Outlook, Microsoft) stay in Latin script. Use Arabic punctuation (، ؛ ؟). Digits stay Western/Latin "
            "(0-9), inserted by code — never convert numbers to Eastern Arabic numerals."
        ),
        "plural": (
            "Arabic ICU plural categories: provide `zero`, `one`, `two`, `few`, `many` and `other` — all six, every "
            "time, each branch in the same dialect (e.g. zero {ما في مكالمات} one {مكالمة وحدة} two {مكالمتين} "
            "few {# مكالمات} many {# مكالمة} other {# مكالمة}); keep `#` for the number."
        ),
    },
    "ru": {
        "name": "Russian",
        "style": (
            "Standard contemporary Russian for a business SaaS web app, the register of the Russian UIs of Google, "
            "Microsoft and Russian-language CRM products. Address the user formally with вы (lower-case, never ты) "
            "and avoid forms that force the user's gender: prefer impersonal or passive phrasing ('Не удалось "
            "сохранить', 'Изменения сохранены') over gendered past-tense verbs. Concise UI register: infinitives for "
            "buttons and menu actions (Сохранить, Отмена, Удалить, Добавить) and short noun phrases for labels, "
            "table headers and badges, as Russian software does. Standard Russian software terminology (эл. почта, "
            "пароль, настройки, счёт, коммерческое предложение, лид/лиды, звонок/звонки); use ё where standard "
            "(ещё, счёт). Russian typography: «ёлочки» for quotation marks, a spaced dash (—) where English uses "
            "' - ' or ' — ', otherwise keep the source's punctuation (…, :, ?). Currency is the Israeli shekel "
            "(₪, шекель); digits stay Latin (0-9) and, like the ₪ symbol, are inserted by code through "
            "{placeholders} — keep every placeholder as-is and never spell numbers out."
        ),
        "plural": (
            "Russian ICU plural categories: every plural block MUST provide `one`, `few`, `many` and `other` (and "
            "keep any explicit `=0`/`=1` branch of the English). `one` = 1, 21, 31… (1 звонок); `few` = 2–4, 22–24… "
            "(2 звонка); `many` = 0, 5–20, 25–30… (5 звонков); `other` = fractions (1,5 звонка), so `other` "
            "normally repeats the `few` wording, never the `many` one. Keep `#` inside the branches. Example: "
            "\"{count, plural, one {# call} other {# calls}}\" → "
            "\"{count, plural, one {# звонок} few {# звонка} many {# звонков} other {# звонка}}\"."
        ),
    },
}

# Plural categories every plural block must carry, per locale (checked on top of the
# generic structure validation). Russian needs all four for correct nouns; Arabic has six.
REQUIRED_PLURAL_CATS = {
    "ru": {"one", "few", "many", "other"},
    "ar": {"zero", "one", "two", "few", "many", "other"},
}

APP_CONTEXT = (
    "The product is AnswerAI (answerai.co.il): AI voice agents that answer and place phone calls for small "
    "businesses in Israel. You are translating the web portal business owners and their staff use: "
    "dashboard, contacts (including a do-not-call list), call logs with transcripts and recordings, "
    "callbacks, outbound campaigns, a calendar with appointments, leads, quotes, jobs, invoices, the business "
    "profile / knowledge base the AI agent learns from (services, products, FAQs, policies, docs, integrations, "
    "team, call transfers, modules), AI agent configuration (voice, conversation, tools), phone numbers and SIP "
    "trunks, plans and billing (Stripe, VAT), account settings, and the login/registration pages. "
    "'Agent' always means the AI voice agent, never a human. 'Business' is the customer's company (a tenant). "
    "'Contact' is a person who called or was called. 'Lead' is a sales lead. 'Callback' is a scheduled return call. "
    "'Campaign' is a batch of outbound AI calls to a list of recipients. 'Module' is an optional feature pack."
)

RULES = """Rules — follow every one:
1. Output ONLY the translations in the requested JSON shape; no explanations.
2. ICU MessageFormat must survive intact: keep every {placeholder} name exactly (same spelling, same braces); keep
   the structure of {x, plural, …} / {x, select, …} blocks, translating the text inside EVERY category brace (a branch
   such as `monthly {monthly}` or `=0 {Add}` must come back with its words translated — only the category name before
   the brace stays English) and keeping `#`; keep every <tag>…</tag> pair with the same tag names (reorder them in the sentence as the grammar
   needs). A literal apostrophe directly before { or } must be written as '' — otherwise use normal apostrophes.
3. Never translate: the brand "AnswerAI"; other product names (Stripe, Twilio, ElevenLabs, WhatsApp, Google, Outlook,
   Microsoft, SIP); URLs; email addresses; code-like tokens; currency codes (ILS); ICU keywords (plural, select, other, one…).
   Keep "DNC" after the translated phrase for "Do not call (DNC)"-style strings.
4. Match the meaning and tone of the English exactly (a warning stays a warning, a question stays a question). Keep
   the translation about as short as the English — these strings sit in buttons, table headers and badges.
5. Sentence case like the source; keep trailing punctuation (…, :, ?) as in the source. Keep ellipsis as …
6. Be consistent: use the glossary terms provided every time the concept appears, and keep the same word for the
   same concept across all strings in the batch. The `context` of each string is its key path (screen.component.key)
   — use it to disambiguate (e.g. a key under "toasts" is a toast, under "meta" a page title, under "empty" an
   empty-state message, "placeholder" a form placeholder).
7. Strings that are already language-neutral (e.g. "—", "AnswerAI", "₪", a number, "SIP") are returned unchanged."""

PLACEHOLDER_RE = re.compile(r"\{\s*([a-zA-Z0-9_]+)\s*(?=[,}])")
TAG_RE = re.compile(r"</?([a-zA-Z][a-zA-Z0-9]*)>")
PLURAL_CAT_RE = re.compile(r"(?:^|\s)(=\d+|zero|one|two|few|many|other)\s*\{")


def api_key():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        env = os.path.join(HERE, ".env")
        if os.path.exists(env):
            for line in open(env):
                if line.startswith("OPENAI_API_KEY="):
                    key = line.strip().split("=", 1)[1]
    if not key:
        sys.exit("OPENAI_API_KEY missing")
    return key


def ssl_context():
    """python.org builds ship without a CA bundle; prefer certifi, then the macOS system bundle."""
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    for cafile in ("/etc/ssl/cert.pem", "/private/etc/ssl/cert.pem"):
        if os.path.exists(cafile):
            return ssl.create_default_context(cafile=cafile)
    return ssl.create_default_context()


SSL_CONTEXT = ssl_context()


def openai_responses(payload, retries=6):
    data = json.dumps(payload).encode()
    delay = 3
    for attempt in range(retries):
        req = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=data,
            headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=600, context=SSL_CONTEXT) as resp:
                body = json.load(resp)
            if body.get("status") not in ("completed", None):
                raise RuntimeError(f"response status {body.get('status')}: {body.get('error') or body.get('incomplete_details')}")
            for item in body.get("output", []):
                if item.get("type") == "message":
                    for part in item.get("content", []):
                        if part.get("type") == "output_text":
                            return part["text"], body.get("usage", {})
            raise RuntimeError("no output_text in response")
        except urllib.error.HTTPError as exc:
            text = exc.read().decode(errors="replace")[:500]
            if exc.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(delay)
                delay = min(delay * 2, 60)
                continue
            raise RuntimeError(f"HTTP {exc.code}: {text}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt < retries - 1:
                time.sleep(delay)
                delay = min(delay * 2, 60)
                continue
            raise
    raise RuntimeError("unreachable")


# ---------- message files ----------

def flatten(node, prefix=""):
    out = {}
    if isinstance(node, dict):
        for k, v in node.items():
            out.update(flatten(v, f"{prefix}{k}." if prefix or True else k))
    else:
        out[prefix[:-1]] = node
    return out


def unflatten(flat):
    root = {}
    for key, value in flat.items():
        node = root
        parts = key.split(".")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    return root


def order_like(template, data):
    """Nested dict `data` reordered to follow the key order of `template`."""
    if not isinstance(template, dict):
        return data
    out = {}
    for k, v in template.items():
        if k in data:
            out[k] = order_like(v, data[k])
    for k, v in data.items():
        if k not in out:
            out[k] = v
    return out


def load_json(path, default=None):
    if not os.path.exists(path):
        return default if default is not None else {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def namespaces():
    d = os.path.join(ROOT, "messages", "en")
    return sorted(f[:-5] for f in os.listdir(d) if f.endswith(".json"))


PLURAL_OPEN_RE = re.compile(r"\{\s*([a-zA-Z0-9_]+)\s*,\s*(plural|selectordinal)\s*,")


def latin_hash(message):
    """Rewrite `#` inside plural/selectordinal blocks to `{var}`.

    intl-messageformat formats `#` with Intl.NumberFormat(locale) — Arabic-Indic digits
    under "ar" — while a plain `{var}` argument is stringified with Latin digits, which
    is what the product uses everywhere (lib/money, lib/datetime). Nested blocks resolve
    `#` to the innermost plural variable, as ICU does.
    """
    out = []
    stack = []  # (var or None) per open brace
    i = 0
    while i < len(message):
        ch = message[i]
        if ch == "{":
            m = PLURAL_OPEN_RE.match(message, i)
            stack.append(m.group(1) if m else None)
            out.append(ch)
        elif ch == "}":
            if stack:
                stack.pop()
            out.append(ch)
        elif ch == "#":
            var = next((v for v in reversed(stack) if v), None)
            out.append(f"{{{var}}}" if var else ch)
        else:
            out.append(ch)
        i += 1
    return "".join(out)


LATIN_HASH_LOCALES = {"ar"}


# ---------- validation ----------

ICU_OPEN_RE = re.compile(r"\{\s*([a-zA-Z0-9_]+)\s*,\s*(plural|selectordinal|select)\s*,")


def icu_branches(s):
    """(category, body) for every branch of every plural/select block, nested ones included."""
    out = []
    i = 0
    while True:
        m = ICU_OPEN_RE.search(s, i)
        if not m:
            return out
        j = m.end()
        depth = 1
        start = j
        while j < len(s) and depth:
            depth += {"{": 1, "}": -1}.get(s[j], 0)
            j += 1
        body = s[start : j - 1]
        k = 0
        while k < len(body):
            bm = re.match(r"\s*(=?\w+)\s*\{", body[k:])
            if not bm:
                break
            c = k + bm.end()
            d = 1
            while c < len(body) and d:
                d += {"{": 1, "}": -1}.get(body[c], 0)
                c += 1
            out.append((bm.group(1), body[k + bm.end() : c - 1]))
            out.extend(icu_branches(body[k + bm.end() : c - 1]))
            k = c
        i = j


def icu_blocks(s):
    """(kind, [(category, body), …]) per plural/selectordinal/select block, nested ones first."""
    out = []
    i = 0
    while True:
        m = ICU_OPEN_RE.search(s, i)
        if not m:
            return out
        j = m.end()
        depth = 1
        start = j
        while j < len(s) and depth:
            depth += {"{": 1, "}": -1}.get(s[j], 0)
            j += 1
        body = s[start : j - 1]
        branches = []
        k = 0
        while k < len(body):
            bm = re.match(r"\s*(=?\w+)\s*\{", body[k:])
            if not bm:
                break
            c = k + bm.end()
            d = 1
            while c < len(body) and d:
                d += {"{": 1, "}": -1}.get(body[c], 0)
                c += 1
            inner = body[k + bm.end() : c - 1]
            branches.append((bm.group(1), inner))
            out.extend(icu_blocks(inner))
            k = c
        out.append((m.group(2), branches))
        i = j




def untranslated_branches(src, dst):
    """Branch bodies the model copied verbatim although the English has real words in them."""
    dst_branches = icu_branches(dst)
    bad = []
    for cat, body in icu_branches(src):
        words = re.sub(r"\{[^{}]*\}|<[^>]*>|#", "", body)
        if not re.search(r"[a-z]{2,}", words):
            continue
        if any(c == cat and b.strip() == body.strip() for c, b in dst_branches):
            bad.append(cat)
    return bad


def placeholders(s):
    """{name} arguments. A plural/select branch whose body is a single bare word
    (`monthly {monthly}`, `=0 {Add}`) is text, not an argument — a real argument
    inside a branch is written `{{name}}` — so it must not be required verbatim
    in the translation."""
    bare = {(cat, body.strip()) for cat, body in icu_branches(s) if re.fullmatch(r"\s*[a-zA-Z0-9_]+\s*", body)}
    out = set()
    for m in PLACEHOLDER_RE.finditer(s):
        cat = re.search(r"(=?\w+)\s*$", s[: m.start()])
        if cat and (cat.group(1), m.group(1)) in bare:
            continue
        out.add(m.group(1))
    return sorted(out)


def signature(s):
    placeholders_ = placeholders(s)
    tags = sorted(set(TAG_RE.findall(s)))
    has_plural = bool(re.search(r"\{\s*[a-zA-Z0-9_]+\s*,\s*(plural|selectordinal)", s))
    has_select = bool(re.search(r"\{\s*[a-zA-Z0-9_]+\s*,\s*select\b", s))
    return placeholders_, tags, has_plural, has_select


# Per-locale register guard. Arabic is Palestinian colloquial: tanwin (ً ٌ ٍ) only
# occurs in فصحى morphology (شكرًا, جارٍ, تلقائيًا), so its presence means the model
# drifted back to Modern Standard Arabic. Brand/technical terms are Latin and never
# carry it, so no allow-list is needed.
TANWIN_RE = re.compile("[\u064B\u064C\u064D]")
REGISTER_CHECKS = {"ar": lambda s: ["tanwin (فصحى register)"] if TANWIN_RE.search(s) else []}


def plural_blocks(s):
    """Category sets of each top-level plural/selectordinal block in `s`."""
    out = []
    i = 0
    while True:
        m = PLURAL_OPEN_RE.search(s, i)
        if not m:
            return out
        j = m.end()
        depth = 1
        start = j
        while j < len(s) and depth:
            depth += {"{": 1, "}": -1}.get(s[j], 0)
            j += 1
        body = s[start : j - 1]
        cats = set()
        k = 0
        while k < len(body):
            bm = re.match(r"\s*(=?\w+)\s*\{", body[k:])
            if not bm:
                break
            cats.add(bm.group(1))
            c = k + bm.end()
            d = 1
            while c < len(body) and d:
                d += {"{": 1, "}": -1}.get(body[c], 0)
                c += 1
            k = c
        out.append(cats)
        i = j


def locale_problems(loc, dst):
    issues = []
    required = REQUIRED_PLURAL_CATS.get(loc)
    if required:
        for cats in plural_blocks(dst):
            missing = required - cats
            if missing:
                issues.append(f"plural categories missing: {', '.join(sorted(missing))}")
    check_register = REGISTER_CHECKS.get(loc)
    if check_register:
        issues.extend(check_register(dst))
    return issues


def problems(src, dst, loc=None):
    issues = []
    if not isinstance(dst, str) or not dst.strip():
        return ["empty"]
    sp, st, splural, sselect = signature(src)
    dp, dt, dplural, dselect = signature(dst)
    if sp != dp:
        issues.append(f"placeholders {sp} -> {dp}")
    if st != dt:
        issues.append(f"tags {st} -> {dt}")
    if splural != dplural:
        issues.append("plural block lost/added")
    if sselect != dselect:
        issues.append("select block lost/added")
    if dst.count("{") != dst.count("}"):
        issues.append("unbalanced braces")
    if re.search(r"'[{}]", dst):
        issues.append("apostrophe before brace (ICU quoting)")
    if sselect:
        s_cats = set(PLURAL_CAT_RE.findall(src)) - {"other"}
        d_cats = set(PLURAL_CAT_RE.findall(dst)) - {"other"}
        # select keys are data values and must be kept verbatim
        s_keys = set(re.findall(r"select\s*,\s*((?:[^{}]|\{[^{}]*\})*)", src))
        if s_keys:
            for word in re.findall(r"(\w+)\s*\{", s_keys.pop()):
                if not re.search(rf"\b{re.escape(word)}\s*\{{", dst):
                    issues.append(f"select option '{word}' missing")
    if splural or sselect:
        for cat in untranslated_branches(src, dst):
            issues.append(f"text inside branch '{cat}' left in English")
    if loc:
        issues.extend(locale_problems(loc, dst))
    return issues


# ---------- glossary ----------

GLOSSARY_TERMS = [
    "AI agent (the AI voice agent that answers calls)", "Dashboard", "Contacts", "Contact", "Do not call (DNC)",
    "Calls", "Inbound call", "Outbound call", "Call log", "Callback", "Callbacks", "Campaign", "Campaigns",
    "Recipient", "Recipients", "Calendar", "Appointment", "Appointments", "Lead", "Leads", "Quote", "Quotes",
    "Job", "Jobs", "Invoice", "Invoices", "Business profile", "Knowledge base", "Basic info", "Services",
    "Products", "FAQs", "Policies", "Docs (documents)", "Integrations", "Team", "Transfers (call transfers)",
    "Transfer target", "Modules", "Phone numbers", "SIP trunk", "Plans", "Plan", "Billing", "Subscription",
    "Setup fee", "VAT", "Settings", "Profile", "Notifications", "Log in", "Log out", "Sign up", "Register",
    "Forgot password", "Reset password", "Verify email", "Invitation", "Business (the customer's company)",
    "Owner", "Admin", "Member", "Voice", "Transcript", "Recording", "Live call", "Test call", "Extraction",
    "Import", "Export", "Draft", "Sent", "Accepted", "Declined", "Paid", "Overdue", "Void", "Scheduled",
    "Completed", "Cancelled", "No-show", "Business hours", "Timezone", "Line item", "Tax invoice", "Due date",
    "Status", "Priority", "Caller", "Greeting", "Prompt (agent instructions)", "Tool (agent capability)",
    "Variable", "Slot (calendar availability slot)", "Reschedule", "Reassign", "Archive", "Restore",
    "Search", "Filter", "Save", "Cancel", "Delete", "Edit", "Create", "Add", "Remove", "Enable", "Disable",
    "Loading…", "Something went wrong", "Try again", "Unsaved changes", "Email", "Password", "Phone",
    "Mobile", "Address", "Notes", "Description", "Name", "First name", "Last name", "Company", "Website",
]


def build_glossary(locs):
    glossary = load_json(GLOSSARY_PATH)
    for loc in locs:
        lang = LANG[loc]
        schema = {
            "type": "object",
            "properties": {t: {"type": "string"} for t in GLOSSARY_TERMS},
            "required": list(GLOSSARY_TERMS),
            "additionalProperties": False,
        }
        instructions = (
            f"You are the lead {lang['name']} localizer for a SaaS product.\n{APP_CONTEXT}\n\nStyle: {lang['style']}\n\n"
            "Produce the canonical UI term for each English term below — the single rendering that will be used "
            "consistently across the whole product. Give the bare term only (no explanation), in the form it would "
            "appear as a menu label, in exactly the register described under Style: for a dialect that means the "
            "everyday word people actually use in apps and chats (an established technical/product word counts, a "
            "formal dictionary rendering does not), with no tanwin. Keep 'AnswerAI' and 'SIP' untranslated. Return "
            "a JSON object keyed by the exact English term."
        )
        payload = {
            "model": MODEL,
            "reasoning": {"effort": EFFORT},
            "input": [
                {"role": "developer", "content": instructions},
                {"role": "user", "content": json.dumps(GLOSSARY_TERMS, ensure_ascii=False)},
            ],
            "text": {"format": {"type": "json_schema", "name": "glossary", "strict": True, "schema": schema}},
            "max_output_tokens": 20000,
        }
        text, usage = openai_responses(payload)
        terms = json.loads(text)
        flagged = {t: v for t, v in terms.items() if locale_problems(loc, v)}
        if flagged:
            print(f"[glossary:{loc}] {len(flagged)} terms break the register: {json.dumps(flagged, ensure_ascii=False)}")
        glossary[loc] = terms
        print(f"[glossary:{loc}] {len(terms)} terms, usage={usage.get('total_tokens')}")
    save_json(GLOSSARY_PATH, glossary)
    print(f"wrote {GLOSSARY_PATH}")


# ---------- translation ----------

def translate_batch(loc, items, glossary, note=""):
    """items: list of (key, english). Returns dict key -> translation."""
    lang = LANG[loc]
    schema = {
        "type": "object",
        "properties": {k: {"type": "string"} for k, _ in items},
        "required": [k for k, _ in items],
        "additionalProperties": False,
    }
    instructions = (
        f"You translate UI strings from English into {lang['name']}.\n\n{APP_CONTEXT}\n\nStyle: {lang['style']}\n"
        f"{lang['plural']}\n\n{RULES}\n\nGlossary (English → {lang['name']}), use these renderings consistently:\n"
        + json.dumps(glossary.get(loc, {}), ensure_ascii=False)
        + ("\n\n" + note if note else "")
        + "\n\nReturn a JSON object with exactly the same keys as the input, each value the translated string."
    )
    user = json.dumps([{"key": k, "context": k, "en": v} for k, v in items], ensure_ascii=False)
    payload = {
        "model": MODEL,
        "reasoning": {"effort": EFFORT},
        "input": [
            {"role": "developer", "content": instructions},
            {"role": "user", "content": user},
        ],
        "text": {"format": {"type": "json_schema", "name": "translations", "strict": True, "schema": schema}},
        "max_output_tokens": 30000,
    }
    text, usage = openai_responses(payload)
    return json.loads(text), usage


def run(args):
    glossary = load_json(GLOSSARY_PATH)
    if not glossary:
        sys.exit("glossary.json missing — run `translate.py glossary` first")
    locs = args.locales.split(",")
    nss = args.ns.split(",") if args.ns else namespaces()

    jobs = []  # (loc, ns, [(key, en)])
    sources = {}
    for ns in nss:
        en = flatten(load_json(os.path.join(ROOT, "messages", "en", f"{ns}.json")))
        sources[ns] = en
        for loc in locs:
            cache = load_json(os.path.join(CACHE_DIR, f"{loc}.json"))
            todo = []
            for key, val in en.items():
                if not isinstance(val, str):
                    continue
                full = f"{ns}.{key}"
                entry = cache.get(full)
                if args.force or not entry or entry.get("en") != val:
                    todo.append((full, val))
            for i in range(0, len(todo), args.batch):
                jobs.append((loc, ns, todo[i : i + args.batch]))
    total = sum(len(j[2]) for j in jobs)
    print(f"{len(jobs)} batches, {total} strings to translate ({', '.join(locs)})")
    if not jobs:
        write_outputs(locs, nss, sources)
        return

    results = {loc: {} for loc in locs}
    usage_total = 0
    failures = []

    def work(job):
        loc, ns, items = job
        out, usage = translate_batch(loc, items, glossary)
        fixed = {}
        retry = []
        for key, en in items:
            dst = out.get(key)
            issues = problems(en, dst, loc) if dst is not None else ["missing"]
            if issues:
                retry.append((key, en, issues))
            else:
                fixed[key] = dst
        # second pass, one by one, with the specific complaint
        for key, en, issues in retry:
            print(f"  retry {loc} {key}: {issues}")
            note = (
                "Your previous attempt for this string was rejected: " + "; ".join(issues)
                + ". Keep every {placeholder}, every <tag>, and the ICU plural/select structure of the English exactly, "
                + "and translate the words inside every plural/select branch, staying in the register described under Style. " + LANG[loc]["plural"]
            )
            try:
                out2, usage2 = translate_batch(loc, [(key, en)], glossary, note)
                dst2 = out2.get(key)
                issues2 = problems(en, dst2, loc) if dst2 is not None else ["missing"]
                if issues2:
                    failures.append((loc, key, en, dst2, issues2))
                else:
                    fixed[key] = dst2
            except Exception as exc:  # noqa: BLE001
                failures.append((loc, key, en, None, [str(exc)]))
        return loc, ns, fixed, usage.get("total_tokens", 0)

    done = 0
    with cf.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(work, job) for job in jobs]
        for fut in cf.as_completed(futures):
            try:
                loc, ns, fixed, used = fut.result()
            except Exception as exc:  # noqa: BLE001
                print(f"BATCH FAILED: {exc}")
                continue
            results[loc].update(fixed)
            usage_total += used
            done += 1
            print(f"  [{done}/{len(jobs)}] {loc}/{ns}: {len(fixed)} ok (tokens so far {usage_total})")
            # persist incrementally
            cache_path = os.path.join(CACHE_DIR, f"{loc}.json")
            cache = load_json(cache_path)
            for full, dst in fixed.items():
                ns_name, key = full.split(".", 1)
                cache[full] = {"en": sources[ns_name][key], "t": dst}
            save_json(cache_path, cache)

    write_outputs(locs, nss, sources)
    for loc, key, en, dst, issues in failures:
        print(f"FAILED {loc} {key}: {issues}\n   en: {en}\n   got: {dst}")
    print(f"done. tokens={usage_total}, failures={len(failures)}")


def write_outputs(locs, nss, sources):
    for loc in locs:
        cache = load_json(os.path.join(CACHE_DIR, f"{loc}.json"))
        for ns in nss:
            en_nested = load_json(os.path.join(ROOT, "messages", "en", f"{ns}.json"))
            flat = {}
            for key, val in sources[ns].items():
                entry = cache.get(f"{ns}.{key}")
                if entry and entry.get("en") == val:
                    flat[key] = latin_hash(entry["t"]) if loc in LATIN_HASH_LOCALES else entry["t"]
            nested = order_like(en_nested, unflatten(flat))
            save_json(os.path.join(ROOT, "messages", loc, f"{ns}.json"), nested)
            missing = len(sources[ns]) - len(flat)
            print(f"wrote messages/{loc}/{ns}.json ({len(flat)} strings{', ' + str(missing) + ' missing' if missing else ''})")


def check(args):
    locs = args.locales.split(",")
    bad = 0
    for ns in namespaces():
        en = flatten(load_json(os.path.join(ROOT, "messages", "en", f"{ns}.json")))
        for loc in locs:
            tr = flatten(load_json(os.path.join(ROOT, "messages", loc, f"{ns}.json")))
            for key, val in en.items():
                if key not in tr:
                    print(f"MISSING {loc} {ns}.{key}")
                    bad += 1
                    continue
                issues = problems(val, tr[key], loc)
                if issues:
                    print(f"BAD {loc} {ns}.{key}: {issues}\n   en: {val}\n   {loc}: {tr[key]}")
                    bad += 1
            extra = set(tr) - set(en)
            for key in sorted(extra):
                print(f"EXTRA {loc} {ns}.{key}")
    print(f"--- {bad} problems")
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("glossary")
    g.add_argument("--locales", default=",".join(LANG))
    r = sub.add_parser("run")
    r.add_argument("--ns", default="")
    r.add_argument("--locales", default="he,ar,ru")
    r.add_argument("--force", action="store_true")
    r.add_argument("--batch", type=int, default=50)
    r.add_argument("--workers", type=int, default=6)
    c = sub.add_parser("check")
    c.add_argument("--locales", default="he,ar,ru")
    args = ap.parse_args()
    if args.cmd == "glossary":
        build_glossary(args.locales.split(","))
    elif args.cmd == "run":
        run(args)
    elif args.cmd == "check":
        sys.exit(check(args))


if __name__ == "__main__":
    main()
