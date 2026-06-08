#!/usr/bin/env python3
"""Phase 0 route contract audit for Liga EDUmind.

This script builds an operational baseline from three perspectives:
1. Runtime routes mounted by the FastAPI application.
2. Declarative routes exposed by ``app.api.v1.api_router``.
3. Frontend API calls found in ``frontend/src``.

It is intentionally conservative: the goal is not to prove that every flow
works, but to surface mismatches early so releases are blocked before they
reach production.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_SRC_DIR = ROOT_DIR / "frontend" / "src"
ORIGINAL_CWD = Path.cwd()


def _bootstrap_backend_env() -> None:
    os.environ["SECRET_KEY"] = os.environ.get("SECRET_KEY", "phase0-audit-secret")
    os.environ["DATABASE_URL"] = os.environ.get(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./phase0_audit.db",
    )
    os.environ["REDIS_URL"] = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    os.environ["DEBUG"] = "false"
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, str(BACKEND_DIR))


_bootstrap_backend_env()

from fastapi.routing import APIRoute  # noqa: E402
from app.api.v1 import api_router  # noqa: E402
from app.main import app  # noqa: E402


AXIOS_CALL_PATTERN = re.compile(
    r"""
    (?P<callee>
        axios
        |apiClient(?:\.client)?
        |this\.client
    )
    \.
    (?P<method>get|post|put|patch|delete)
    \s*
    \(
    \s*
    (?P<literal>`[^`]*`|'[^']*'|"[^"]*")
    """,
    re.VERBOSE | re.DOTALL,
)

FETCH_CALL_PATTERN = re.compile(
    r"""
    fetch
    \s*
    \(
    \s*
    (?P<literal>`[^`]*`|'[^']*'|"[^"]*")
    (?P<tail>.*?)
    \)
    """,
    re.VERBOSE | re.DOTALL,
)

SPECIAL_API_PATHS = {"/api/health", "/api/v1/health"}


CRITICAL_FLOWS = (
    {
        "id": "auth-core",
        "title": "Sesion principal",
        "required_routes": (
            ("POST", "/api/v1/auth/register"),
            ("POST", "/api/v1/auth/login"),
            ("POST", "/api/v1/auth/refresh"),
            ("POST", "/api/v1/auth/logout"),
            ("GET", "/api/v1/auth/me"),
        ),
        "notes": "Base de autenticacion y cierre de sesion.",
    },
    {
        "id": "offline-core",
        "title": "Trabajo offline y resincronizacion",
        "required_routes": (
            ("HEAD", "/api/health"),
            ("HEAD", "/api/v1/health"),
            ("GET", "/api/v1/ligas/{param}"),
            ("GET", "/api/v1/equipos/"),
            ("GET", "/api/v1/partidos/"),
            ("GET", "/api/v1/partidos/{param}/evaluacion-personalizada"),
        ),
        "notes": "Necesario para preparar ligas offline y resincronizar.",
    },
    {
        "id": "public-wiki",
        "title": "Wiki publica",
        "required_routes": (
            ("GET", "/api/v1/game-resources/wiki"),
            ("GET", "/api/v1/game-resources/categorias"),
            ("GET", "/api/v1/tipos-deporte/"),
            ("GET", "/api/v1/taxonomias/"),
        ),
        "notes": "Exploracion publica de fichas y taxonomias.",
    },
    {
        "id": "public-repository",
        "title": "Repositorio publico",
        "required_routes": (
            ("GET", "/api/v1/game-resources/repository"),
            ("GET", "/api/v1/game-resources/download-anonymous/{param}"),
        ),
        "notes": "Descarga anonima de fichas reutilizables.",
    },
    {
        "id": "profile-nextcloud",
        "title": "Integracion Nextcloud",
        "required_routes": (
            ("GET", "/api/v1/auth/me/integration/nextcloud"),
            ("PUT", "/api/v1/auth/me/integration/nextcloud"),
            ("POST", "/api/v1/auth/me/integration/nextcloud/test"),
            ("DELETE", "/api/v1/auth/me/integration/nextcloud"),
        ),
        "notes": "Configuracion docente de nube personal.",
    },
    {
        "id": "team-portal",
        "title": "Portal publico de equipos",
        "required_routes": (
            ("GET", "/api/v1/public/team/{param}"),
            ("POST", "/api/v1/public/team/{param}/join"),
        ),
        "notes": "Acceso publico por token de equipo.",
    },
)


@dataclass(frozen=True)
class RouteRecord:
    path: str
    methods: tuple[str, ...]
    name: str
    source: str


@dataclass(frozen=True)
class FrontendCall:
    method: str
    path: str
    file: str
    line: int


def canonicalize_path(path: str) -> str:
    value = path.strip()
    value = re.sub(r"https?://[^/]+", "", value)
    value = re.sub(r"\$\{[^}]+\}", "{param}", value)
    value = value.replace("{baseUrl}", "").replace("{apiUrl}", "").replace("{prefix}", "")
    value = value.replace("${baseUrl}", "").replace("${apiUrl}", "").replace("${prefix}", "")
    value = value.split("?", 1)[0].split("#", 1)[0]
    value = re.sub(r"/{2,}", "/", value)

    if not value:
        return "/"

    if not value.startswith("/"):
        value = f"/{value}"

    if value == "/":
        normalized = value
    elif value.startswith("/api/"):
        normalized = value
    elif value.startswith("/api/v1"):
        normalized = value
    elif value in SPECIAL_API_PATHS:
        normalized = value
    else:
        normalized = f"/api/v1{value}"

    normalized = re.sub(r"\{[^}/]+\}", "{param}", normalized)
    normalized = re.sub(r"/:([^/]+)", "/{param}", normalized)
    normalized = re.sub(r"/(?:\d+|true|false)(?=/|$)", "/{param}", normalized)
    normalized = re.sub(r"(?<!/)\{param\}$", "", normalized)

    return normalized


def simplify_special_method(method: str) -> str:
    if method in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        return method
    return method


def route_records_from_router(routes: Iterable[object], source: str, prefix: str = "") -> list[RouteRecord]:
    records: list[RouteRecord] = []
    for route in routes:
        if not isinstance(route, APIRoute):
            continue
        filtered_methods = sorted(
            simplify_special_method(method)
            for method in route.methods
            if method not in {"OPTIONS"}
        )
        if not filtered_methods:
            continue
        path = canonicalize_path(f"{prefix}{route.path}")
        records.append(
            RouteRecord(
                path=path,
                methods=tuple(filtered_methods),
                name=route.name,
                source=source,
            )
        )
    return sorted(records, key=lambda item: (item.path, item.methods))


def first_segment(path: str) -> str | None:
    parts = [segment for segment in path.split("/") if segment]
    if parts[:2] == ["api", "v1"] and len(parts) >= 3:
        return parts[2]
    if len(parts) >= 2 and parts[0] == "api":
        return parts[1]
    return parts[0] if parts else None


def decode_literal(literal: str) -> str:
    if len(literal) < 2:
        return literal
    return literal[1:-1]


def extract_api_path(raw_value: str, known_segments: set[str]) -> str | None:
    if not raw_value:
        return None

    cleaned = raw_value.strip()
    cleaned = re.sub(r"\$\{[^}]+\}", "{param}", cleaned)

    for special in SPECIAL_API_PATHS:
        if special in cleaned:
            return canonicalize_path(special)

    if "/api/v1/" in cleaned:
        start = cleaned.find("/api/v1/")
        return canonicalize_path(cleaned[start:])

    if "/api/health" in cleaned:
        return canonicalize_path("/api/health")

    matches: list[tuple[int, str]] = []
    for segment in known_segments:
        token = f"/{segment}"
        position = cleaned.find(token)
        if position != -1:
            matches.append((position, cleaned[position:]))

    if not matches:
        return None

    matches.sort(key=lambda item: item[0])
    return canonicalize_path(matches[0][1])


def discover_frontend_calls(known_segments: set[str]) -> list[FrontendCall]:
    calls: list[FrontendCall] = []

    for file_path in sorted(FRONTEND_SRC_DIR.rglob("*")):
        if file_path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue

        content = file_path.read_text(encoding="utf-8")

        for match in AXIOS_CALL_PATTERN.finditer(content):
            path = extract_api_path(decode_literal(match.group("literal")), known_segments)
            if not path:
                continue
            line_number = content.count("\n", 0, match.start()) + 1
            calls.append(
                FrontendCall(
                    method=match.group("method").upper(),
                    path=path,
                    file=str(file_path.relative_to(ROOT_DIR)),
                    line=line_number,
                )
            )

        for match in FETCH_CALL_PATTERN.finditer(content):
            path = extract_api_path(decode_literal(match.group("literal")), known_segments)
            if not path:
                continue
            method_match = re.search(
                r"method\s*:\s*['\"](?P<method>[A-Za-z]+)['\"]",
                match.group("tail"),
            )
            method = method_match.group("method").upper() if method_match else "GET"
            line_number = content.count("\n", 0, match.start()) + 1
            calls.append(
                FrontendCall(
                    method=method,
                    path=path,
                    file=str(file_path.relative_to(ROOT_DIR)),
                    line=line_number,
                )
            )

    deduped = {
        (call.method, call.path, call.file, call.line): call
        for call in calls
    }
    return sorted(deduped.values(), key=lambda item: (item.path, item.method, item.file, item.line))


def build_route_index(records: Iterable[RouteRecord]) -> dict[str, set[str]]:
    index: dict[str, set[str]] = {}
    for record in records:
        index.setdefault(record.path, set()).update(record.methods)
    return index


def path_matches(candidate: str, route_path: str) -> bool:
    if candidate == route_path:
        return True

    candidate_segments = [segment for segment in candidate.strip("/").split("/") if segment]
    route_segments = [segment for segment in route_path.strip("/").split("/") if segment]

    if len(candidate_segments) != len(route_segments):
        return False

    for left, right in zip(candidate_segments, route_segments, strict=True):
        if left == right:
            continue
        if "{param}" in {left, right}:
            continue
        return False
    return True


def route_supports(index: dict[str, set[str]], method: str, path: str) -> bool:
    for route_path, methods in index.items():
        if not path_matches(path, route_path):
            continue
        if method in methods:
            return True
        if method == "HEAD" and "GET" in methods:
            return True
    return False


def audit_critical_flows(runtime_index: dict[str, set[str]]) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    for flow in CRITICAL_FLOWS:
        missing = [
            {"method": method, "path": path}
            for method, path in flow["required_routes"]
            if not route_supports(runtime_index, method, path)
        ]
        results.append(
            {
                "id": flow["id"],
                "title": flow["title"],
                "notes": flow["notes"],
                "missing": missing,
                "status": "ok" if not missing else "blocked",
            }
        )
    return results


def generate_report() -> dict[str, object]:
    runtime_records = route_records_from_router(app.routes, source="runtime")
    declared_records = route_records_from_router(api_router.routes, source="api_router", prefix="/api/v1")

    runtime_index = build_route_index(runtime_records)
    declared_index = build_route_index(declared_records)

    known_segments = {
        segment
        for segment in {
            *(first_segment(record.path) for record in runtime_records),
            *(first_segment(record.path) for record in declared_records),
            "health",
        }
        if segment
    }

    frontend_calls = discover_frontend_calls(known_segments)

    runtime_keys = {(record.path, record.methods) for record in runtime_records}
    declared_keys = {(record.path, record.methods) for record in declared_records}

    runtime_only = [
        asdict(record)
        for record in runtime_records
        if (record.path, record.methods) not in declared_keys and record.path.startswith("/api/v1/")
    ]
    declared_only = [
        asdict(record)
        for record in declared_records
        if (record.path, record.methods) not in runtime_keys
    ]

    unmatched_frontend_calls = [
        asdict(call)
        for call in frontend_calls
        if not route_supports(runtime_index, call.method, call.path)
    ]

    critical_flow_results = audit_critical_flows(runtime_index)

    return {
        "summary": {
            "runtime_route_count": len(runtime_records),
            "declared_route_count": len(declared_records),
            "runtime_only_count": len(runtime_only),
            "declared_only_count": len(declared_only),
            "frontend_call_count": len(frontend_calls),
            "unmatched_frontend_call_count": len(unmatched_frontend_calls),
            "blocked_critical_flow_count": sum(
                1 for flow in critical_flow_results if flow["status"] != "ok"
            ),
        },
        "critical_flows": critical_flow_results,
        "runtime_only_routes": runtime_only,
        "declared_only_routes": declared_only,
        "unmatched_frontend_calls": unmatched_frontend_calls,
    }


def render_markdown(report: dict[str, object]) -> str:
    summary = report["summary"]
    lines = [
        "# Fase 0 - Auditoria De Contrato De Rutas",
        "",
        "## Resumen",
        f"- Rutas runtime: {summary['runtime_route_count']}",
        f"- Rutas declaradas en `api_router`: {summary['declared_route_count']}",
        f"- Drift runtime vs `api_router`: {summary['runtime_only_count']} runtime-only, {summary['declared_only_count']} declaradas-no-montadas",
        f"- Llamadas frontend detectadas: {summary['frontend_call_count']}",
        f"- Llamadas frontend sin ruta runtime: {summary['unmatched_frontend_call_count']}",
        f"- Flujos criticos bloqueados: {summary['blocked_critical_flow_count']}",
        "",
        "## Flujos Criticos",
    ]

    for flow in report["critical_flows"]:
        status = "OK" if flow["status"] == "ok" else "BLOCKED"
        lines.append(f"- `{flow['id']}` [{status}] {flow['title']}: {flow['notes']}")
        if flow["missing"]:
            for missing in flow["missing"]:
                lines.append(f"  - Falta `{missing['method']} {missing['path']}`")
    lines.append("")

    lines.append("## Drift De Router")
    if report["runtime_only_routes"]:
        lines.append("- Runtime montado pero ausente en `api_router`:")
        for route in report["runtime_only_routes"]:
            methods = "/".join(route["methods"])
            lines.append(f"  - `{methods} {route['path']}`")
    else:
        lines.append("- Sin drift runtime-only.")

    if report["declared_only_routes"]:
        lines.append("- Declarado en `api_router` pero no montado en runtime:")
        for route in report["declared_only_routes"]:
            methods = "/".join(route["methods"])
            lines.append(f"  - `{methods} {route['path']}`")
    else:
        lines.append("- Sin drift declarative-only.")

    lines.append("")
    lines.append("## Llamadas Frontend Sin Contrato Runtime")
    if report["unmatched_frontend_calls"]:
        for call in report["unmatched_frontend_calls"]:
            lines.append(
                f"- `{call['method']} {call['path']}` en `{call['file']}:{call['line']}`"
            )
    else:
        lines.append("- No se detectaron llamadas frontend sin ruta runtime.")

    return "\n".join(lines) + "\n"


def render_summary(report: dict[str, object]) -> str:
    summary = report["summary"]
    return (
        "route-contract-audit "
        f"runtime={summary['runtime_route_count']} "
        f"declared={summary['declared_route_count']} "
        f"runtime_only={summary['runtime_only_count']} "
        f"declared_only={summary['declared_only_count']} "
        f"frontend_unmatched={summary['unmatched_frontend_call_count']} "
        f"blocked_flows={summary['blocked_critical_flow_count']}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit backend/frontend route contracts.")
    parser.add_argument(
        "--format",
        choices=("json", "markdown", "summary"),
        default="summary",
        help="Output format.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional output file path.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return exit code 1 when contract drift or blocked flows are detected.",
    )
    args = parser.parse_args()

    report = generate_report()

    if args.format == "json":
        rendered = json.dumps(report, indent=2, ensure_ascii=True) + "\n"
    elif args.format == "markdown":
        rendered = render_markdown(report)
    else:
        rendered = render_summary(report) + "\n"

    if args.output:
        output_path = args.output if args.output.is_absolute() else (ORIGINAL_CWD / args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)

    summary = report["summary"]
    has_blockers = any(
        (
            summary["runtime_only_count"],
            summary["declared_only_count"],
            summary["unmatched_frontend_call_count"],
            summary["blocked_critical_flow_count"],
        )
    )
    return 1 if args.strict and has_blockers else 0


if __name__ == "__main__":
    raise SystemExit(main())
