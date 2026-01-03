from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIALS_DIR = ROOT / "partials"

HEADER_START = "<!-- HEADER START -->"
HEADER_END = "<!-- HEADER END -->"
FOOTER_START = "<!-- FOOTER START -->"
FOOTER_END = "<!-- FOOTER END -->"

HEADER_PARTIAL = PARTIALS_DIR / "header.html"
FOOTER_PARTIAL = PARTIALS_DIR / "footer.html"


def indent_block(block: str, indent: str) -> str:
    return "\n".join(f"{indent}{line}" if line else indent for line in block.splitlines())


def replace_section(
    text: str,
    start_marker: str,
    end_marker: str,
    replacement: str,
    block_regex: re.Pattern[str],
) -> str:
    marker_pattern = re.compile(
        rf"(^[ \t]*){re.escape(start_marker)}.*?{re.escape(end_marker)}",
        re.S | re.M,
    )
    marker_match = marker_pattern.search(text)
    if marker_match:
        indent = marker_match.group(1)
        new_block = (
            f"{indent}{start_marker}\n"
            f"{indent_block(replacement, indent)}\n"
            f"{indent}{end_marker}"
        )
        return marker_pattern.sub(new_block, text, count=1)

    block_match = block_regex.search(text)
    if not block_match:
        return text

    indent = block_match.group(1)
    new_block = (
        f"{indent}{start_marker}\n"
        f"{indent_block(replacement, indent)}\n"
        f"{indent}{end_marker}"
    )
    return f"{text[:block_match.start()]}{new_block}{text[block_match.end():]}"


def sync_file(path: Path, header_html: str, footer_html: str) -> None:
    raw = path.read_text(encoding="utf-8")
    newline = "\r\n" if "\r\n" in raw else "\n"
    text = raw.replace("\r\n", "\n")

    header_regex = re.compile(
        r"(^[ \t]*)<header class=\"site-header\">.*?</header>",
        re.S | re.M,
    )
    footer_regex = re.compile(
        r"(^[ \t]*)<footer class=\"footer\">.*?</footer>",
        re.S | re.M,
    )

    updated = replace_section(
        text,
        HEADER_START,
        HEADER_END,
        header_html,
        header_regex,
    )
    updated = replace_section(
        updated,
        FOOTER_START,
        FOOTER_END,
        footer_html,
        footer_regex,
    )

    updated = updated.replace("\n", newline)
    if updated != raw:
        path.write_text(updated, encoding="utf-8")


def main() -> None:
    if not HEADER_PARTIAL.exists() or not FOOTER_PARTIAL.exists():
        raise SystemExit("Missing partials. Expected partials/header.html and partials/footer.html.")

    header_html = HEADER_PARTIAL.read_text(encoding="utf-8").strip()
    footer_html = FOOTER_PARTIAL.read_text(encoding="utf-8").strip()

    for html_file in ROOT.glob("*.html"):
        sync_file(html_file, header_html, footer_html)


if __name__ == "__main__":
    main()
