#!/usr/bin/env python3

#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#
"""
Legacy API smoke script for manual runtime checks.

Usage:
  python backend/scripts/api_smoke_legacy.py
"""

from __future__ import annotations

import sys
from typing import Callable
from typing import Tuple

import requests

BASE_URL = "http://localhost:8004"


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    NC = "\033[0m"


def health() -> Tuple[bool, str]:
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            return True, "Health endpoint OK"
        return False, f"Health returned {response.status_code}"
    except Exception as exc:  # pragma: no cover - legacy manual script
        return False, str(exc)


def leagues_list() -> Tuple[bool, str]:
    try:
        response = requests.get(f"{BASE_URL}/api/leagues", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return True, f"Leagues endpoint OK ({len(data.get('leagues', []))} leagues)"
        return False, f"Leagues returned {response.status_code}"
    except Exception as exc:  # pragma: no cover - legacy manual script
        return False, str(exc)


def sports_list() -> Tuple[bool, str]:
    try:
        response = requests.get(f"{BASE_URL}/api/sports", timeout=5)
        if response.status_code == 200:
            return True, "Sports endpoint OK"
        return False, f"Sports returned {response.status_code}"
    except Exception as exc:  # pragma: no cover - legacy manual script
        return False, str(exc)


def run_checks() -> int:
    checks: list[tuple[str, Callable[[], Tuple[bool, str]]]] = [
        ("Health Check", health),
        ("Leagues List", leagues_list),
        ("Sports List", sports_list),
    ]

    passed = 0
    failed = 0

    print("\n==================================================")
    print("  Liga EDUmind - Legacy API Smoke")
    print("==================================================\n")

    for name, fn in checks:
        ok, message = fn()
        if ok:
            print(f"  {Colors.GREEN}OK{Colors.NC} {name}: {message}")
            passed += 1
        else:
            print(f"  {Colors.RED}FAIL{Colors.NC} {name}: {message}")
            failed += 1

    print("\n==================================================")
    print(f"  Results: {passed} passed, {failed} failed")
    print("==================================================\n")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_checks())
