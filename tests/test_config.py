"""Tests for configuration and constants."""

from app.config import get_settings, PROJECT_ROOT
from app.constants import EVALUATION_WEIGHTS, INTENTS, TOTAL_DATASET_SIZE


def test_settings_singleton():
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


def test_project_root_exists():
    assert PROJECT_ROOT.exists()


def test_intents_count():
    assert len(INTENTS) == 30


def test_dataset_size():
    assert TOTAL_DATASET_SIZE == 300


def test_evaluation_weights_sum():
    assert abs(sum(EVALUATION_WEIGHTS.values()) - 1.0) < 0.001
