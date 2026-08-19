"""Tests for utility functions."""

import json

import pytest

from app.utils.helpers import compute_hash, extract_json_from_text, truncate_text


def test_extract_json_plain():
    text = '{"intent": "billing_inquiry", "confidence": 0.95}'
    result = extract_json_from_text(text)
    assert result["intent"] == "billing_inquiry"
    assert result["confidence"] == 0.95


def test_extract_json_fenced():
    text = 'Here is the result:\n```json\n{"priority": "high"}\n```'
    result = extract_json_from_text(text)
    assert result["priority"] == "high"


def test_compute_hash_deterministic():
    h1 = compute_hash("test email content")
    h2 = compute_hash("test email content")
    assert h1 == h2


def test_compute_hash_unique():
    h1 = compute_hash("email one")
    h2 = compute_hash("email two")
    assert h1 != h2


def test_truncate_text():
    long_text = "a" * 600
    truncated = truncate_text(long_text, 100)
    assert len(truncated) == 100
    assert truncated.endswith("...")


def test_extract_json_invalid():
    with pytest.raises(ValueError):
        extract_json_from_text("no json here")
