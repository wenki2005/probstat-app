"""Wolfram 风格符号计算测试。"""
import pytest

from app.services.symbolic_service import compute_expression


def test_derivative():
    r = compute_expression("derivative(sin(x)*x^2, x)")
    assert r["kind"] == "derivative"
    assert "x" in r["result_latex"]


def test_integral_definite():
    r = compute_expression("integral(x^2, x, 0, 1)")
    assert abs(r["numeric"] - 1 / 3) < 1e-9


def test_limit():
    r = compute_expression("limit(sin(x)/x, x, 0)")
    assert r["numeric"] == pytest.approx(1.0)


def test_solve():
    r = compute_expression("solve(x^2-4=0, x)")
    assert r["kind"] == "solve"
    assert set(r["numeric"]) == {-2.0, 2.0}


def test_sum():
    r = compute_expression("sum(1/n^2, n, 1, oo)")
    assert abs(r["numeric"] - 3.141592653589793**2 / 6) < 1e-6


def test_simple_value():
    r = compute_expression("sqrt(2)+1")
    assert r["numeric"] == pytest.approx(2.41421356)


def test_invalid_symbol():
    with pytest.raises(Exception):
        compute_expression("evil(x)")