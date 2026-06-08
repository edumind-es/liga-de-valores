#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

import io

from PIL import Image

from app.services.submission_policy_service import (
    analyze_drawing_for_policy,
    analyze_text_for_policy,
    build_daily_fingerprint,
)


def _build_png(width: int, height: int, pixel_factory) -> bytes:
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            pixels[x, y] = pixel_factory(x, y)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_analyze_text_for_policy_detects_default_blocked_terms() -> None:
    result = analyze_text_for_policy("Este juego es una mierda")
    assert result.blocked is True
    assert "mierda" in result.matched_terms


def test_analyze_text_for_policy_detects_custom_blocked_terms() -> None:
    result = analyze_text_for_policy(
        "Mi palabra secreta es infracciongrave",
        custom_blocklist="infracciongrave",
    )
    assert result.blocked is True
    assert "infracciongrave" in result.matched_terms


def test_analyze_drawing_for_policy_flags_aggressive_pattern() -> None:
    image_bytes = _build_png(
        120,
        120,
        lambda x, _: (220, 0, 0) if x < 60 else (20, 20, 20),
    )

    result = analyze_drawing_for_policy(image_bytes)
    assert result.flagged is True
    assert "possible_aggressive_pattern" in result.reasons


def test_analyze_drawing_for_policy_flags_small_images() -> None:
    image_bytes = _build_png(24, 24, lambda *_: (200, 200, 200))
    result = analyze_drawing_for_policy(image_bytes)
    assert result.flagged is True
    assert "image_too_small" in result.reasons


def test_build_daily_fingerprint_returns_none_without_secret() -> None:
    fingerprint = build_daily_fingerprint("10.0.0.1", "agent", None)
    assert fingerprint is None


def test_build_daily_fingerprint_is_stable_for_same_inputs() -> None:
    first = build_daily_fingerprint("10.0.0.1", "agent", "secret")
    second = build_daily_fingerprint("10.0.0.1", "agent", "secret")
    assert first == second
    assert first is not None
    assert len(first) == 64
