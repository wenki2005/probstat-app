"""计算引擎测试：P(X<1.96)、分布计算、MLE。"""
import math

import pytest

from app.services.compute_service import (
    compute_distribution,
    compute_probability,
    mle,
)


def test_p_x_lt_196():
    r = compute_probability("P(X<1.96)")
    assert abs(r["result"] - 0.975002) < 1e-5
    assert r["dist"] == {"mu": 0, "sigma": 1}


def test_p_x_gt():
    r = compute_probability("P(X>1.65)")
    assert abs(r["result"] - 0.049471) < 1e-5


def test_p_between():
    r = compute_probability("P(1.2<X<2.5)")
    assert 0 < r["result"] < 1


def test_p_with_normal_suffix():
    r = compute_probability("P(X<2)~N(1,4)")
    assert r["dist"] == {"mu": 1, "sigma": 2}
    assert abs(r["result"] - 0.691462) < 1e-5


def test_p_invalid():
    with pytest.raises(ValueError):
        compute_probability("hello world")


def test_distribution_summary():
    r = compute_distribution("normal-distribution", {"mu": 0, "sigma": 1}, "summary")
    assert r["mean"] == 0
    assert r["variance"] == 1


def test_distribution_cdf():
    r = compute_distribution("normal-distribution", {"mu": 0, "sigma": 1}, "cdf", x=1.96)
    assert abs(r["value"] - 0.975002) < 1e-5


def test_distribution_quantile():
    r = compute_distribution("normal-distribution", {"mu": 0, "sigma": 1}, "quantile", p=0.975)
    assert abs(r["value"] - 1.959964) < 1e-4


def test_binomial_mean():
    r = compute_distribution("binomial-distribution", {"n": 10, "p": 0.5}, "summary")
    assert r["mean"] == 5
    assert abs(r["variance"] - 2.5) < 1e-9


def test_mle_normal():
    sample = [1.0, 2.0, 3.0, 4.0, 5.0]
    r = mle("normal-distribution", sample)
    assert abs(r["estimates"]["mu"] - 3.0) < 1e-9
    assert abs(r["estimates"]["sigma2"] - 2.0) < 1e-9


def test_mle_exponential():
    sample = [1.0, 2.0, 3.0]
    r = mle("exponential-distribution", sample)
    assert abs(r["estimates"]["lambda"] - 1.0 / 2.0) < 1e-9