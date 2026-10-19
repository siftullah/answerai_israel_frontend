#!/usr/bin/env python3
"""Report t()/t.rich()/rt() keys used in source files that are missing from messages/en.

Usage: python3 -I scripts/i18n/check_keys.py [--ns NAMESPACE]... <file-or-dir>...
  --ns NAME   also list keys in messages/en/NAME.json that no scanned file uses

Understands:
  const t = useTranslations("ns");  const t = useTranslations("ns.sub");
  const t = await getTranslations("ns");  getTranslations({ namespace: "ns" })
  t("key"), t.rich("key"), t.raw("key"), t.has("key"), t.markup("key"), rt("full.key")
  labelMap("prefix", ["a", "b"])  -> checks prefix.a, prefix.b
Template-literal keys (t(`x.${y}`)) are reported as "dynamic" and not checked.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MSG_DIR = os.path.join(ROOT, "messages", "en")


def load_messages():
    msgs = {}
    for name in os.listdir(MSG_DIR):
        if name.endswith(".json"):
            with open(os.path.join(MSG_DIR, name), encoding="utf-8") as fh:
                try:
                    msgs[name[:-5]] = json.load(fh)
                except json.JSONDecodeError as exc:
                    print(f"INVALID JSON: messages/en/{name}: {exc}")
                    msgs[name[:-5]] = {}
    return msgs


def has_key(msgs, full_key):
    node = msgs
    for part in full_key.split("."):
        if not isinstance(node, dict) or part not in node:
            return False
        node = node[part]
    return isinstance(node, str)


def flatten(node, prefix=""):
    out = []
    if isinstance(node, dict):
        for k, v in node.items():
            out.extend(flatten(v, f"{prefix}{k}."))
    else:
        out.append(prefix[:-1])
    return out


def iter_files(paths):
    for p in paths:
        p = os.path.join(ROOT, p) if not os.path.isabs(p) else p
        if os.path.isdir(p):
            for dirpath, _, files in os.walk(p):
                for f in files:
                    if f.endswith((".ts", ".tsx")):
                        yield os.path.join(dirpath, f)
        elif os.path.isfile(p):
            yield p


DECL_RE = re.compile(
    r"(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\s*\(\s*"
    r"(?:\"([^\"]*)\"|'([^']*)'|\{\s*namespace\s*:\s*(?:\"([^\"]*)\"|'([^']*)')[^}]*\})?\s*\)"
)
CALL_TPL = r"(?<![\w$.])%s(?:\.(?:rich|raw|has|markup))?\s*\(\s*(?:\"([^\"]+)\"|'([^']+)'|`([^`]+)`)"
RT_RE = re.compile(r"(?<![\w$.])rt\s*\(\s*(?:\"([^\"]+)\"|'([^']+)'|`([^`]+)`)")
LABELMAP_RE = re.compile(r"labelMap\s*\(\s*\"([^\"]+)\"\s*,\s*\[([^\]]*)\]")


def scan_file(path, msgs):
    src = open(path, encoding="utf-8").read()
    rel = os.path.relpath(path, ROOT)
    missing, dynamic, used = [], [], set()

    decls = {}
    for m in DECL_RE.finditer(src):
        var = m.group(1)
        ns = m.group(2) or m.group(3) or m.group(4) or m.group(5) or ""
        decls.setdefault(var, set()).add(ns)

    for var, namespaces in decls.items():
        call_re = re.compile(CALL_TPL % re.escape(var))
        for m in call_re.finditer(src):
            key = m.group(1) or m.group(2)
            tpl = m.group(3)
            line = src.count("\n", 0, m.start()) + 1
            if tpl is not None:
                dynamic.append((rel, line, var, tpl))
                continue
            ok = False
            for ns in namespaces:
                full = f"{ns}.{key}" if ns else key
                if has_key(msgs, full):
                    used.add(full)
                    ok = True
                    break
            if not ok:
                missing.append((rel, line, f"{var}(\"{key}\") in namespace {sorted(namespaces)}"))

    for m in RT_RE.finditer(src):
        key = m.group(1) or m.group(2)
        tpl = m.group(3)
        line = src.count("\n", 0, m.start()) + 1
        if tpl is not None:
            dynamic.append((rel, line, "rt", tpl))
        elif has_key(msgs, key):
            used.add(key)
        else:
            missing.append((rel, line, f"rt(\"{key}\")"))

    for m in LABELMAP_RE.finditer(src):
        prefix = m.group(1)
        for k in re.findall(r"\"([^\"]+)\"|'([^']+)'", m.group(2)):
            key = k[0] or k[1]
            full = f"{prefix}.{key}"
            line = src.count("\n", 0, m.start()) + 1
            if has_key(msgs, full):
                used.add(full)
            else:
                missing.append((rel, line, f"labelMap {full}"))

    return missing, dynamic, used


def main(argv):
    ns_check = []
    paths = []
    i = 0
    while i < len(argv):
        if argv[i] == "--ns":
            ns_check.append(argv[i + 1])
            i += 2
        else:
            paths.append(argv[i])
            i += 1
    if not paths:
        print(__doc__)
        return 2

    msgs = load_messages()
    all_missing, all_dynamic, all_used = [], [], set()
    for f in iter_files(paths):
        m, d, u = scan_file(f, msgs)
        all_missing += m
        all_dynamic += d
        all_used |= u

    for rel, line, what in all_missing:
        print(f"MISSING  {rel}:{line}  {what}")
    for rel, line, var, tpl in all_dynamic:
        print(f"dynamic  {rel}:{line}  {var}(`{tpl}`)  (not checked)")
    for ns in ns_check:
        keys = flatten(msgs.get(ns, {}), f"{ns}.")
        unused = [k for k in keys if k not in all_used]
        for k in unused:
            print(f"unused   {k}")
        print(f"--- namespace {ns}: {len(keys)} keys, {len(unused)} unused by scanned files")
    print(f"--- {len(all_missing)} missing, {len(all_dynamic)} dynamic, {len(all_used)} keys used")
    return 1 if all_missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
