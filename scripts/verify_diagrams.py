#!/usr/bin/env python3
"""
verify_diagrams.py — One-shot dev/CI tool for rebuilding `notes.json`,
scanning every Mermaid diagram in the notes corpus, and verifying that
each one is free of the lexical-error patterns that have historically
broken rendering in the browser.

This mirrors the in-browser `sanitizeMermaidCode` logic from `js/app.js`
so that problems caught here match problems users would see in the UI.

Exit codes
----------
  0 — all diagrams pass
  1 — one or more diagrams still contain risky, unquoted labels after
       sanitization (regression)
  2 — generic I/O or parse failure

Typical usage
-------------
  # From repo root
  python3 scripts/verify_diagrams.py
  python3 scripts/verify_diagrams.py --verbose
  python3 scripts/verify_diagrams.py --rebuild-index

Use in CI
---------
  - run: python3 scripts/verify_diagrams.py --rebuild-index
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Tuple

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
NOTES_INDEX = REPO_ROOT / "notes.json"

# Modules to walk — matches the top-level `N-ModuleName/` folders.
MODULE_DIR_RE = re.compile(r"^\d+-[A-Za-z0-9_\-]+$")

# A fenced mermaid block in markdown.
MERMAID_BLOCK_RE = re.compile(
    r"```mermaid\n(?P<code>[\s\S]*?)```",
    re.MULTILINE,
)

# ---------------------------------------------------------------------------
# Mermaid sanitizer — direct Python port of `sanitizeMermaidCode` (app.js)
# ---------------------------------------------------------------------------

RISKY = re.compile(r"[()<>:&#,;=|{}\/\\]")

# All shape patterns, in the same order as app.js (most specific first).
SHAPES: List[Tuple[re.Pattern, str]] = [
    # Cylinder:        ID[(label)]
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\[\(([^\]]*?)\)\]"),  "[({})]"),
    # Subroutine:      ID[[label]]
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\[\[([^\]]*?)\]\]"), "[[{}]]"),
    # Parallelogram R: ID[/label/]
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\[\/([^\]]*?)\/\]"), "[/{}/]"),
    # Parallelogram L: ID[\label\]
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\[\\([^\]]*?)\\\]"), "[\\{}\\]"),
    # Hexagon:         ID{{label}}
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\{\{([^}]*?)\}\}"),  "{{{{{0}}}}}"),  # noqa
    # Circle:          ID((label))
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\(\(([^)]*?)\)\)"),  "(({}))"),
    # Stadium:         ID([label])
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\(\[([^\]]*?)\]\)"), "([{}])"),
    # Asymmetric:      ID>label]
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)>([^\]]*?)\]"),       ">{}]"),
    # Rhombus:         ID{label}
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\{([^}]*?)\}"),       "{{{}}}"),
    # Rounded:         ID(label)
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\(([^()\[\]]*?)\)"),  "({})"),
    # Rectangle:       ID[label]
    (re.compile(r"(^|[\s\[\]\(\)\{\}>|;,])([A-Za-z0-9_]+)\[([^\[\]]*?)\]"),    "[{}]"),
]


def safe_label(inner: str) -> str:
    trimmed = inner.strip()
    if re.match(r'^".*"$', trimmed, re.DOTALL):
        return inner
    if not RISKY.search(trimmed):
        return inner
    return '"' + trimmed.replace('"', "#quot;") + '"'


def first_directive(code: str) -> str:
    for raw in code.split("\n"):
        line = raw.strip()
        if not line or line.startswith("%%") or line.startswith("---"):
            continue
        return line.lower()
    return ""


def sanitize_mermaid(code: str) -> str:
    if not code:
        return code
    code = code.replace("\r\n", "\n").replace("\r", "\n")
    directive = first_directive(code)
    is_flowchart = bool(re.match(r"^(flowchart|graph)\b", directive))

    def process_line(line: str) -> str:
        if re.match(r"^\s*%%", line):
            return line
        if re.match(r"^\s*(classDef|class|style|linkStyle|subgraph|end|direction)\b", line):
            return line
        if not is_flowchart:
            return line

        stash: List[str] = []
        PLACEHOLDER = "\x01MZ{}\x01"

        def hold(token: str) -> str:
            stash.append(token)
            return PLACEHOLDER.format(len(stash) - 1)

        out = line
        for rx, tpl in SHAPES:
            def repl(m: re.Match, _tpl: str = tpl) -> str:
                pre, ident, lbl = m.group(1), m.group(2), m.group(3)
                safe = safe_label(lbl)
                # Manually reconstruct each shape because `{}` collides with
                # `.format()`; we do raw string building to avoid that.
                shape = _tpl
                if _tpl == "[({})]":     node = f"{ident}[({safe})]"
                elif _tpl == "[[{}]]":  node = f"{ident}[[{safe}]]"
                elif _tpl == "[/{}/]":  node = f"{ident}[/{safe}/]"
                elif _tpl == "[\\{}\\]":  node = f"{ident}[\\{safe}\\]"
                elif _tpl.startswith("{{{{"):    node = f"{ident}{{{{{safe}}}}}"
                elif _tpl == "(({}))":   node = f"{ident}(({safe}))"
                elif _tpl == "([{}])":   node = f"{ident}([{safe}])"
                elif _tpl == ">{}]":     node = f"{ident}>{safe}]"
                elif _tpl == "{{{}}}":   node = f"{ident}{{{safe}}}"
                elif _tpl == "({})":     node = f"{ident}({safe})"
                elif _tpl == "[{}]":     node = f"{ident}[{safe}]"
                else:                    node = f"{ident}{_tpl.format(safe)}"
                return pre + hold(node)

            out = rx.sub(repl, out)

        # Edge labels:  --|lbl|-->  or  -->|lbl|
        def edge_repl(m: re.Match) -> str:
            arrow, lbl = m.group(1), m.group(2)
            return f"{arrow}|{safe_label(lbl)}|"

        out = re.sub(r"(-{1,3}|={2,3}|\.{1,3})\|([^|]+?)\|", edge_repl, out)

        # Restore — loop because a stashed token may itself contain
        # placeholders for previously stashed inner tokens.
        def restore(m: re.Match) -> str:
            return stash[int(m.group(1))]

        while "\x01MZ" in out:
            prev = out
            out = re.sub(r"\x01MZ(\d+)\x01", restore, out)
            if out == prev:
                break
        return out

    return "\n".join(process_line(ln) for ln in code.split("\n"))


# ---------------------------------------------------------------------------
# Risky-label detector (post-sanitization)
# ---------------------------------------------------------------------------

# A "risky, unquoted label" is one of the shape forms where the label
# content contains a risky char AND is not enclosed in double quotes.
# We purposely look only at whole-node shapes to avoid false positives
# on fragments inside already-quoted labels.
RISKY_NODE_PATTERNS = [
    # Cylinder [(...)]
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\[\((?!")([^"\]]*?)\)\]'),
    # Subroutine [[...]]
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\[\[(?!")([^"\]]*?)\]\]'),
    # Hexagon {{...}}
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\{\{(?!")([^"}]*?)\}\}'),
    # Circle ((...))
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\(\((?!")([^")]*?)\)\)'),
    # Stadium ([...])
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\(\[(?!")([^"\]]*?)\]\)'),
    # Asymmetric >...]
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)>(?!")([^"\]]*?)\]'),
    # Rhombus {...}
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\{(?!")([^"{}]*?)\}'),
    # Rounded (...)
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\((?!")([^"()\[\]]*?)\)'),
    # Rectangle [...]
    re.compile(r'(?<![A-Za-z0-9_])([A-Za-z0-9_]+)\[(?!")([^"\[\]]*?)\]'),
]


@dataclass
class Finding:
    file: str
    block_index: int
    line_no: int
    snippet: str
    kind: str


@dataclass
class Report:
    total_files_scanned: int = 0
    total_blocks: int = 0
    flowchart_blocks: int = 0
    blocks_changed: int = 0
    findings: List[Finding] = field(default_factory=list)


def scan_block(path: Path, block_idx: int, code: str, rep: Report, verbose: bool) -> None:
    rep.total_blocks += 1
    directive = first_directive(code)
    is_flowchart = bool(re.match(r"^(flowchart|graph)\b", directive))
    if is_flowchart:
        rep.flowchart_blocks += 1

    sanitized = sanitize_mermaid(code)
    if sanitized != code:
        rep.blocks_changed += 1

    # Detection only applies to flowchart/graph diagrams — other diagram
    # types (mindmap, sequenceDiagram, classDiagram, gantt, pie, etc.) have
    # their own syntax where parens/colons inside labels are perfectly legal.
    if not is_flowchart:
        if verbose:
            status = "CHANGED" if sanitized != code else "ok     "
            kind = directive.split()[0] if directive else "?"
            print(f"    [{status}] block #{block_idx} ({kind}, skipped detection)")
        return

    # After sanitization, there should be NO unquoted-risky node labels.
    # If there are, it's a regression in the sanitizer vs. this note.
    #
    # Before scanning we BLANK OUT all double-quoted spans `"..."` on the
    # line so our shape regexes can't match fragments of text that live
    # *inside* an already-safe quoted label. We preserve the outer `"`
    # boundaries so the `(?!")` lookaheads in our detector regexes still
    # correctly skip over quoted labels like `A["VARCHAR(20)"]`.
    # Also handles Mermaid's escaped-quote form `\"..\"` by treating the
    # outer `"` characters as the quote delimiters.
    def blank_quotes(s: str) -> str:
        # First pass: mask escaped inner quotes so they don't terminate a span.
        tmp = s.replace(r'\"', '\x02\x02')
        tmp = re.sub(r'"[^"]*"', lambda m: '"' + " " * (len(m.group(0)) - 2) + '"', tmp)
        return tmp.replace('\x02\x02', r'\"')

    for line_no, line in enumerate(sanitized.split("\n"), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("%%"):
            continue
        if re.match(r"^\s*(classDef|class|style|linkStyle|subgraph|end|direction)\b", stripped):
            continue
        scan_line = blank_quotes(line)
        for rx in RISKY_NODE_PATTERNS:
            for m in rx.finditer(scan_line):
                label = m.group(2)
                if RISKY.search(label) and not label.startswith('"'):
                    rep.findings.append(
                        Finding(
                            file=str(path.relative_to(REPO_ROOT)),
                            block_index=block_idx,
                            line_no=line_no,
                            snippet=line.strip(),
                            kind="unquoted_risky_label",
                        )
                    )

    if verbose:
        status = "CHANGED" if sanitized != code else "ok     "
        kind = "flowchart" if is_flowchart else directive.split()[0] if directive else "?"
        print(f"    [{status}] block #{block_idx} ({kind})")


def iter_markdown_files(root: Path) -> Iterable[Path]:
    for top in sorted(root.iterdir()):
        if not top.is_dir() or not MODULE_DIR_RE.match(top.name):
            continue
        for md in sorted(top.rglob("*.md")):
            yield md


# ---------------------------------------------------------------------------
# notes.json rebuilder
# ---------------------------------------------------------------------------

def rebuild_notes_index(root: Path) -> dict:
    modules = []
    for top in sorted(
        (p for p in root.iterdir() if p.is_dir() and MODULE_DIR_RE.match(p.name)),
        key=lambda p: int(p.name.split("-", 1)[0]),
    ):
        mod_name = top.name
        approach = None
        for f in top.iterdir():
            if f.is_file() and f.suffix == ".md" and "Approach_Guide" in f.name:
                approach = f"{mod_name}/{f.name}"
                break

        subchapters = []
        # Subchapter_X.Y folders, sorted numerically (X.Y)
        def sub_key(p: Path) -> Tuple[int, int]:
            m = re.match(r"Subchapter_(\d+)\.(\d+)", p.name)
            return (int(m.group(1)), int(m.group(2))) if m else (9999, 9999)

        for sub in sorted(
            (p for p in top.iterdir() if p.is_dir() and p.name.startswith("Subchapter_")),
            key=sub_key,
        ):
            files = []
            # Sort numerically by the leading X.Y.Z prefix.
            def file_key(p: Path) -> Tuple[int, int, int, str]:
                m = re.match(r"^(\d+)\.(\d+)\.(\d+)_", p.name)
                if m:
                    return (int(m.group(1)), int(m.group(2)), int(m.group(3)), p.name)
                return (9999, 9999, 9999, p.name)

            for fp in sorted(
                (p for p in sub.iterdir() if p.is_file() and p.suffix == ".md"),
                key=file_key,
            ):
                files.append({
                    "name": fp.name,
                    "path": f"{mod_name}/{sub.name}/{fp.name}",
                })
            subchapters.append({"name": sub.name, "files": files})

        modules.append({
            "name": mod_name,
            "approachGuide": approach,
            "subchapters": subchapters,
        })

    return {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "modules": modules,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser(
        description="Rebuild notes.json and verify every Mermaid diagram.",
    )
    ap.add_argument("--rebuild-index", action="store_true",
                    help=f"Rewrite {NOTES_INDEX.name} from the folder tree.")
    ap.add_argument("--verbose", "-v", action="store_true",
                    help="Print per-block status.")
    ap.add_argument("--json", action="store_true",
                    help="Emit a machine-readable JSON report on stdout.")
    args = ap.parse_args(argv)

    # 1. Optional index rebuild
    if args.rebuild_index:
        data = rebuild_notes_index(REPO_ROOT)
        NOTES_INDEX.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        total_files = sum(len(s["files"]) for m in data["modules"] for s in m["subchapters"])
        total_subs  = sum(len(m["subchapters"]) for m in data["modules"])
        if not args.json:
            print(f"✓ Rebuilt {NOTES_INDEX.relative_to(REPO_ROOT)} "
                  f"({len(data['modules'])} modules, {total_subs} subchapters, "
                  f"{total_files} notes)")

    # 2. Scan all markdown files
    rep = Report()
    for md_file in iter_markdown_files(REPO_ROOT):
        rep.total_files_scanned += 1
        try:
            text = md_file.read_text(encoding="utf-8")
        except OSError as e:
            print(f"  ! Could not read {md_file}: {e}", file=sys.stderr)
            continue

        blocks = list(MERMAID_BLOCK_RE.finditer(text))
        if not blocks:
            continue
        if args.verbose:
            print(f"· {md_file.relative_to(REPO_ROOT)}  ({len(blocks)} block{'s' if len(blocks) != 1 else ''})")
        for idx, m in enumerate(blocks):
            scan_block(md_file, idx, m.group("code"), rep, args.verbose)

    # 3. Report
    if args.json:
        payload = {
            "files_scanned":    rep.total_files_scanned,
            "total_blocks":     rep.total_blocks,
            "flowchart_blocks": rep.flowchart_blocks,
            "blocks_changed":   rep.blocks_changed,
            "findings": [f.__dict__ for f in rep.findings],
        }
        print(json.dumps(payload, indent=2))
    else:
        print()
        print("─" * 64)
        print(f"  Files scanned:        {rep.total_files_scanned}")
        print(f"  Mermaid blocks:       {rep.total_blocks}")
        print(f"    · flowchart/graph:  {rep.flowchart_blocks}")
        print(f"    · auto-quoted:      {rep.blocks_changed}")
        print(f"  Risky findings:       {len(rep.findings)}")
        print("─" * 64)
        if rep.findings:
            print()
            print("⚠ Unquoted risky labels still present after sanitization:")
            print()
            for f in rep.findings[:30]:
                print(f"  {f.file}:block#{f.block_index}:L{f.line_no}")
                print(f"      {f.snippet[:120]}")
            if len(rep.findings) > 30:
                print(f"  … and {len(rep.findings) - 30} more")
            print()
            return 1
        print()
        print("✓ All diagrams pass sanitization.")

    return 0 if not rep.findings else 1


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as exc:
        print(f"✗ Fatal: {exc}", file=sys.stderr)
        sys.exit(2)
