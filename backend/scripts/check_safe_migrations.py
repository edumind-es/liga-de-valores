#!/usr/bin/env python3
"""Fail if Alembic upgrade migrations contain destructive operations."""

from __future__ import annotations

import ast
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

DESTRUCTIVE_OPS = {"drop_table", "drop_column", "drop_constraint"}
RISKY_SQL = re.compile(
    r"\b(drop\s+table|drop\s+column|truncate(\s+table)?)\b",
    re.IGNORECASE,
)


@dataclass
class Finding:
    file: str
    revision: str
    line: int
    detail: str


def _extract_revision(tree: ast.AST) -> str:
    revision = "unknown"
    for node in getattr(tree, "body", []):
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "revision":
            if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                revision = node.value.value
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "revision":
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        revision = node.value.value
    return revision


def _extract_sql_literal(expr: ast.expr) -> str | None:
    if isinstance(expr, ast.Constant) and isinstance(expr.value, str):
        return expr.value
    if isinstance(expr, ast.Call) and isinstance(expr.func, ast.Attribute):
        if expr.func.attr == "text" and expr.args:
            arg = expr.args[0]
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                return arg.value
    return None


def analyze_migration(path: Path, allowed_revisions: set[str]) -> list[Finding]:
    src = path.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(path))
    revision = _extract_revision(tree)
    if revision in allowed_revisions:
        return []

    findings: list[Finding] = []
    for node in getattr(tree, "body", []):
        if not isinstance(node, ast.FunctionDef) or node.name != "upgrade":
            continue

        for call in (n for n in ast.walk(node) if isinstance(n, ast.Call)):
            if not isinstance(call.func, ast.Attribute):
                continue
            attr = call.func.attr

            if attr in DESTRUCTIVE_OPS:
                findings.append(
                    Finding(
                        file=str(path),
                        revision=revision,
                        line=call.lineno,
                        detail=f"{attr} in upgrade()",
                    )
                )
                continue

            if attr == "execute" and call.args:
                sql = _extract_sql_literal(call.args[0])
                if sql and RISKY_SQL.search(sql):
                    findings.append(
                        Finding(
                            file=str(path),
                            revision=revision,
                            line=call.lineno,
                            detail="destructive SQL in op.execute(...)",
                        )
                    )

    return findings


def main() -> int:
    versions_dir = Path(__file__).resolve().parents[1] / "alembic" / "versions"
    if not versions_dir.exists():
        print(f"[FAIL] Versions directory not found: {versions_dir}")
        return 1

    allowed_revisions = {
        rev.strip()
        for rev in os.getenv("MIGRATION_SAFETY_ALLOW_REVISIONS", "").split(",")
        if rev.strip()
    }

    findings: list[Finding] = []
    files = sorted(versions_dir.glob("*.py"))
    for file in files:
        findings.extend(analyze_migration(file, allowed_revisions))

    if findings:
        print("[FAIL] Destructive operations detected in Alembic upgrade migrations:")
        for finding in findings:
            rel_file = finding.file
            print(f" - {rel_file}:{finding.line} [{finding.revision}] {finding.detail}")
        print(
            "Set MIGRATION_SAFETY_ALLOW_REVISIONS=<rev1,rev2> only for explicitly approved exceptions."
        )
        return 1

    print(f"[OK] Migration safety check passed ({len(files)} files scanned, no destructive upgrade ops).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
