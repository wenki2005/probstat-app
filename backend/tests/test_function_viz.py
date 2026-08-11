"""函数绘图与大数定律模拟测试。"""
import pytest

from app.services.function_viz import function_chart, lln_simulation


def test_function_chart_sin():
    data = function_chart([{"expr": "sin(x)", "label": "y=sin(x)"}], x_range=[-6.5, 6.5])
    assert len(data["traces"]) >= 1
    assert len(data["traces"][0]["x"]) > 100


def test_function_chart_tangent():
    data = function_chart([{"expr": "x**2"}], x_range=[-2, 2], tangent_at=1)
    names = [t["name"] for t in data["traces"]]
    assert any("切线" in n for n in names)


def test_function_chart_integral():
    data = function_chart([{"expr": "x**2"}], x_range=[-1, 2], integral=[0, 1])
    names = [t["name"] for t in data["traces"]]
    assert any("∫" in n for n in names)


def test_function_params():
    data = function_chart([{"expr": "a*x**2"}], x_range=[-3, 3], params={"a": 2})
    assert len(data["traces"]) == 1


def test_function_sec():
    data = function_chart([{"expr": "sec(x)"}], x_range=[-3, 3], y_range=[-5, 5])
    assert len(data["traces"]) >= 1
    assert len(data["traces"][0]["x"]) > 100


def test_lln():
    data = lln_simulation(n=500, p=0.5, seed=42)
    assert data["final_frequency"] == pytest.approx(0.5, abs=0.06)
    assert len(data["x"]) > 0
    data2 = lln_simulation(n=500, p=0.5, seed=42)
    assert data["y"] == data2["y"]

def test_constant_function():
    """常数函数（无 x）不应报 0-d 数组错误，返回平直线。"""
    data = function_chart([{"expr": "3"}], x_range=[-2, 2])
    ys = [y for y in data["traces"][0]["y"] if y is not None]
    assert len(ys) > 100
    assert all(abs(v - 3) < 1e-9 for v in ys)


def test_param_only_function():
    data = function_chart([{"expr": "a"}], x_range=[-2, 2], params={"a": 2.5})
    ys = [y for y in data["traces"][0]["y"] if y is not None]
    assert all(abs(v - 2.5) < 1e-9 for v in ys)

def test_implicit_equation_circle():
    data = function_chart([{"expr": "x^2+y^2=1"}], x_range=[-2, 2])
    assert any(t.get("name", "").startswith("x^2+y^2=1") for t in data["traces"])
    assert data["messages"]  # 有“隐式方程”提示


def test_implicit_explicit_y():
    data = function_chart([{"expr": "y = sin(x)"}], x_range=[-3, 3])
    assert data["traces"][0]["type"] == "scatter"


def test_two_var_surface():
    data = function_chart([{"expr": "x^2+y^2"}], x_range=[-2, 2])
    assert data["traces"][0]["type"] == "surface"
    assert "scene" in data["layout"]