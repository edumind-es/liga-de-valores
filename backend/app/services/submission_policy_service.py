#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuna
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
Policy helpers for public game-sheet submissions.
Privacy-first design:
- Block explicit offensive language in free text.
- Flag potentially risky drawings for teacher review.
- Generate irreversible per-day fingerprints without storing raw IP.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import hmac
import io
import re
import unicodedata

from fastapi import Request
from PIL import Image, UnidentifiedImageError


_DEFAULT_BLOCKED_TERMS = {
    "gilipollas",
    "joder",
    "mierda",
    "subnormal",
    "imbecil",
    "idiota",
    "tontorron",
    "cabron",
    "cabrona",
    "puto",
    "puta",
    "cojones",
}


def _remove_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_policy_text(value: str) -> str:
    lowered = _remove_accents(value.lower())
    # Normalize stretched tokens like "pesaddooooo"
    lowered = re.sub(r"(.)\1{2,}", r"\1\1", lowered)
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def _parse_custom_terms(raw_terms: str | None) -> set[str]:
    if not raw_terms:
        return set()
    terms = set()
    for token in raw_terms.split(","):
        normalized = normalize_policy_text(token)
        if normalized:
            terms.add(normalized)
    return terms


@dataclass
class TextPolicyResult:
    blocked: bool
    matched_terms: list[str] = field(default_factory=list)
    normalized_text: str = ""


def analyze_text_for_policy(*chunks: str, custom_blocklist: str | None = None) -> TextPolicyResult:
    merged = " ".join(chunks or [])
    normalized = normalize_policy_text(merged)
    if not normalized:
        return TextPolicyResult(blocked=False, normalized_text="")

    terms = _DEFAULT_BLOCKED_TERMS | _parse_custom_terms(custom_blocklist)
    tokens = normalized.split(" ")
    found = sorted({token for token in tokens if token in terms})
    return TextPolicyResult(
        blocked=bool(found),
        matched_terms=found,
        normalized_text=normalized,
    )


@dataclass
class DrawingPolicyResult:
    flagged: bool
    reasons: list[str] = field(default_factory=list)
    metrics: dict[str, float] = field(default_factory=dict)


def _is_skin_tone_pixel(r: int, g: int, b: int) -> bool:
    # Simple YCbCr-like heuristic for skin-tone abundance.
    cb = 128 - 0.168736 * r - 0.331364 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    return (
        80 <= cb <= 135
        and 135 <= cr <= 180
        and r > 60
        and g > 35
        and b > 20
        and r > g
        and r > b
    )


def analyze_drawing_for_policy(image_bytes: bytes) -> DrawingPolicyResult:
    if not image_bytes:
        return DrawingPolicyResult(flagged=False)

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            image.load()
            rgb = image.convert("RGB")
    except UnidentifiedImageError:
        return DrawingPolicyResult(
            flagged=True,
            reasons=["image_decode_error"],
        )

    width, height = rgb.size
    if width < 48 or height < 48:
        return DrawingPolicyResult(
            flagged=True,
            reasons=["image_too_small"],
            metrics={"width": float(width), "height": float(height)},
        )

    sampled = rgb.copy()
    sampled.thumbnail((256, 256))
    pixels = list(sampled.getdata())
    total = float(len(pixels))
    if total == 0:
        return DrawingPolicyResult(flagged=True, reasons=["empty_image"])

    skin_count = 0
    red_dominant_count = 0
    dark_count = 0
    buckets: set[tuple[int, int, int]] = set()

    for r, g, b in pixels:
        buckets.add((r // 16, g // 16, b // 16))
        if _is_skin_tone_pixel(r, g, b):
            skin_count += 1
        if r >= 150 and r > (g * 1.2) and r > (b * 1.2):
            red_dominant_count += 1
        if max(r, g, b) < 45:
            dark_count += 1

    skin_ratio = skin_count / total
    red_ratio = red_dominant_count / total
    dark_ratio = dark_count / total
    unique_ratio = len(buckets) / 4096.0
    photo_like = unique_ratio >= 0.18

    reasons: list[str] = []
    if photo_like and skin_ratio >= 0.35:
        reasons.append("possible_obscene_or_real_photo")
    if red_ratio >= 0.42 and dark_ratio >= 0.25:
        reasons.append("possible_aggressive_pattern")

    metrics = {
        "skin_ratio": round(skin_ratio, 4),
        "red_ratio": round(red_ratio, 4),
        "dark_ratio": round(dark_ratio, 4),
        "unique_ratio": round(unique_ratio, 4),
        "photo_like": 1.0 if photo_like else 0.0,
    }
    return DrawingPolicyResult(
        flagged=bool(reasons),
        reasons=reasons,
        metrics=metrics,
    )


def resolve_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop

    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip

    return request.client.host if request.client else ""


def build_daily_fingerprint(client_ip: str, user_agent: str, secret: str | None) -> str | None:
    if not secret:
        return None
    day_bucket = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    material = f"{day_bucket}|{client_ip}|{user_agent}".encode("utf-8", errors="ignore")
    return hmac.new(secret.encode("utf-8"), material, hashlib.sha256).hexdigest()
