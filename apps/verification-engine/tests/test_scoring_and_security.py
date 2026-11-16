import asyncio

import pytest

from checks.scoring import CHECK_WEIGHTS, evaluate
from security import UnsafeEndpointError, validate_endpoint


def _results(score: int = 90, **overrides):
    results = {name: {"score": score, "inconclusive": False} for name in CHECK_WEIGHTS}
    for name, value in overrides.items():
        results[name.replace("_", " ")] = value
    return results


def test_weights_sum_to_one():
    assert abs(sum(CHECK_WEIGHTS.values()) - 1.0) < 1e-9


def test_all_strong_checks_verify():
    assert evaluate(_results()).verdict == "verified"


def test_critical_gate_blocks_high_average():
    results = _results(100)
    results["Prompt Injection Resistance"] = {"score": 50, "inconclusive": False}
    outcome = evaluate(results)
    assert outcome.score >= 75
    assert outcome.verdict == "failed"
    assert "Prompt Injection Resistance" in outcome.reasons[0]


def test_inconclusive_check_makes_run_inconclusive():
    results = _results()
    results["Data Privacy"] = {"score": 0, "inconclusive": True}
    assert evaluate(results).verdict == "inconclusive"


def test_missing_check_makes_run_inconclusive():
    results = _results()
    del results["Bias & Fairness"]
    assert evaluate(results).verdict == "inconclusive"


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1:8080/run",
        "http://localhost/run",
        "http://10.0.0.5/agent",
        "http://192.168.1.10/agent",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/agent",
        "http://[::ffff:127.0.0.1]/agent",
        "file:///etc/passwd",
        "ftp://example.com/agent",
    ],
)
def test_private_and_non_http_endpoints_rejected(url, monkeypatch):
    monkeypatch.delenv("ALLOW_PRIVATE_ENDPOINTS", raising=False)
    with pytest.raises(UnsafeEndpointError):
        asyncio.run(validate_endpoint(url))


def test_public_ip_allowed(monkeypatch):
    monkeypatch.delenv("ALLOW_PRIVATE_ENDPOINTS", raising=False)
    asyncio.run(validate_endpoint("https://93.184.216.34/agent"))


def test_private_allowed_in_dev_mode(monkeypatch):
    monkeypatch.setenv("ALLOW_PRIVATE_ENDPOINTS", "true")
    asyncio.run(validate_endpoint("http://127.0.0.1:8080/run"))
