"""数学表达式预处理工具：支持隐式乘法（3x -> 3*x、x(x+1) -> x*(x+1)）、^ -> **、k! -> gamma(k+1)。"""
import re

FUNCS = {
    "sin", "cos", "tan", "sec", "csc", "cot",
    "asin", "acos", "atan", "exp", "log", "ln", "sqrt",
    "abs", "Abs", "sign", "floor", "ceiling", "gamma",
    "factorial", "max", "Min", "Max",
}
CONSTS = {"pi", "Pi", "E", "e", "I", "oo", "infinity"}
# 操作符名（Wolfram 风格调用），括号前不加乘号
OPS = {"derivative", "diff", "integral", "integrate", "limit", "solve", "sum", "summation"}


def implicit_mul(expr: str) -> str:
    """把用户友好写法转成 sympy 可解析形式。"""
    if not expr:
        return expr
    s = expr.replace("^", "**")
    # 阶乘：k! -> gamma(k+1)（排除 !=）
    s = re.sub(r"([A-Za-z0-9\)]+)!(?!=)", r"gamma(\1+1)", s)
    # 数字后紧跟字母/左括号：3x -> 3*x
    s = re.sub(r"(\d)([A-Za-z(])", r"\1*\2", s)
    # 右括号后紧跟字母/左括号/数字：)(x -> )*(x
    s = re.sub(r"(\))([A-Za-z(])", r"\1*\2", s)
    s = re.sub(r"(\))(\d)", r"\1*\2", s)
    # 字母后紧跟数字：x2 -> x*2（函数名后不会跟数字）
    s = re.sub(r"([A-Za-z])(\d)", r"\1*\2", s)
    # 非函数名/常数/操作符的字母后紧跟左括号：x(x+1) -> x*(x+1)；sin(x)、solve(…) 保持不变
    def _fix(m: re.Match) -> str:
        name = m.group(1)
        if name in FUNCS or name in CONSTS or name in OPS:
            return name + "("
        return name + "*("
    s = re.sub(r"([A-Za-z]+)\(", _fix, s)
    return s