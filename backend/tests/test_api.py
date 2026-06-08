#!/usr/bin/env python3
"""
Legacy integration smoke script moved out of pytest collection.

Manual runtime checks are now in:
  backend/scripts/api_smoke_legacy.py
"""

import pytest

pytestmark = pytest.mark.skip(
    reason="Legacy external smoke isolated. Run backend/scripts/api_smoke_legacy.py manually."
)


def test_legacy_api_smoke_isolated() -> None:
    pytest.skip("Legacy smoke moved to backend/scripts/api_smoke_legacy.py")
