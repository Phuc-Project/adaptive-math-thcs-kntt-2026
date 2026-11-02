# -*- coding: utf-8 -*-
"""Sinh data/featured-hdt.js — nội dung dùng thử "Hằng đẳng thức đáng nhớ" (8-C2-B1).
Mỗi câu trắc nghiệm được kiểm bằng sympy: đúng 1 phương án đúng."""
import json, sys
from sympy import symbols, expand, simplify, Rational, sympify, minimum, maximum, S, Interval, solve
from sympy.calculus.util import minimum as smin, maximum as smax

x, y, a, b, n = symbols('x y a b n')
TOPIC = '8-C2-B1'
SRC = 'Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).'
IRT_B = {'N': -1.5, 'H': -0.5, 'V': 0.5, 'T': 1.5}

def eq(e1, e2):
    return simplify(expand(sympify(e1, locals=dict(x=x, y=y, a=a, b=b, n=n)) - sympify(e2, locals=dict(x=x, y=y, a=a, b=b, n=n)))) == 0

Q = []
def mcq(level, prompt, options, correct_idx, solution, checks):
    """options: list of latex strings; checks: list of booleans (True = phương án đúng)."""
    assert len(options) == 4
    assert checks.count(True) == 1, (prompt, checks)
    assert checks.index(True) == correct_idx, (prompt, checks)
    Q.append(dict(level=level, prompt=prompt, options=options, correct=correct_idx, solution=solution))

def expr_q(level, prompt, target, opts, solution):
    """opts: list of (latex, sympy_str); target: sympy_str."""
    checks = [eq(s, target) for _, s in opts]
    mcq(level, prompt, ['$' + l + '$' for l, _ in opts], checks.index(True) if True in checks else -1, solution, checks)

def num_q(level, prompt, value, opts, solution, fmt=lambda v: '$' + str(v) + '$'):
    checks = [sympify(v) == sympify(value) for v in opts]
    mcq(level, prompt, [fmt(v) for v in opts], checks.index(True), solution, checks)

# ----------------------------- NHẬN BIẾT -----------------------------------
expr_q('N', 'Khai triển $(x+3)^2$ ta được', '(x+3)**2', [
    ('x^2+9', 'x**2+9'), ('x^2+6x+9', 'x**2+6*x+9'), ('x^2+3x+9', 'x**2+3*x+9'), ('x^2-6x+9', 'x**2-6*x+9')],
    'Áp dụng $(A+B)^2=A^2+2AB+B^2$ với $A=x,\\ B=3$:\\\\ $(x+3)^2=x^2+2\\cdot x\\cdot 3+3^2=x^2+6x+9$.')

expr_q('N', 'Khai triển $(2x-1)^2$ ta được', '(2*x-1)**2', [
    ('4x^2-4x+1', '4*x**2-4*x+1'), ('4x^2-2x+1', '4*x**2-2*x+1'), ('2x^2-4x+1', '2*x**2-4*x+1'), ('4x^2-1', '4*x**2-1')],
    'Áp dụng $(A-B)^2=A^2-2AB+B^2$ với $A=2x,\\ B=1$:\\\\ $(2x-1)^2=(2x)^2-2\\cdot 2x\\cdot 1+1^2=4x^2-4x+1$.\\\\ Chú ý: $(2x)^2=4x^2$ chứ không phải $2x^2$.')

expr_q('N', 'Biểu thức $x^2-16$ viết thành tích là', 'x**2-16', [
    ('(x-4)^2', '(x-4)**2'), ('(x-16)(x+16)', '(x-16)*(x+16)'), ('(x-4)(x+4)', '(x-4)*(x+4)'), ('(x+4)^2', '(x+4)**2')],
    'Hiệu hai bình phương: $A^2-B^2=(A-B)(A+B)$.\\\\ $x^2-16=x^2-4^2=(x-4)(x+4)$.')

expr_q('N', 'Khai triển $(a+b)^3$ ta được', '(a+b)**3', [
    ('a^3+b^3', 'a**3+b**3'), ('a^3+3ab+b^3', 'a**3+3*a*b+b**3'), ('a^3+3a^2b-3ab^2+b^3', 'a**3+3*a**2*b-3*a*b**2+b**3'), ('a^3+3a^2b+3ab^2+b^3', 'a**3+3*a**2*b+3*a*b**2+b**3')],
    'Lập phương của một tổng: $(A+B)^3=A^3+3A^2B+3AB^2+B^3$.\\\\ Hệ số lần lượt là $1,\\ 3,\\ 3,\\ 1$ và đều mang dấu cộng.')

expr_q('N', 'Biểu thức $x^3-8$ viết thành tích là', 'x**3-8', [
    ('(x-2)(x^2+2x+4)', '(x-2)*(x**2+2*x+4)'), ('(x-2)(x^2-2x+4)', '(x-2)*(x**2-2*x+4)'), ('(x-2)^3', '(x-2)**3'), ('(x+2)(x^2-2x+4)', '(x+2)*(x**2-2*x+4)')],
    'Hiệu hai lập phương: $A^3-B^3=(A-B)(A^2+AB+B^2)$.\\\\ $x^3-8=x^3-2^3=(x-2)(x^2+2x+4)$.\\\\ Mẹo: ngoặc thứ hai là "bình phương thiếu của tổng", dấu giữa ngược với dấu ở ngoặc đầu.')

_id = ['(a-b)**2 - (a**2-b**2)', '(a-b)**2 - (a**2-2*a*b+b**2)', '(a+b)**2 - (a**2+b**2)', '(a**2-b**2) - (a-b)**2']
mcq('N', 'Đẳng thức nào dưới đây đúng với mọi $a,\\ b$?', [
    '$(a-b)^2=a^2-b^2$', '$(a-b)^2=a^2-2ab+b^2$', '$(a+b)^2=a^2+b^2$', '$a^2-b^2=(a-b)^2$'], 1,
    'Chỉ có $(a-b)^2=a^2-2ab+b^2$ là hằng đẳng thức.\\\\ Các đẳng thức còn lại sai, ví dụ với $a=2,\\ b=1$: $(2-1)^2=1$ nhưng $2^2-1^2=3$; $(2+1)^2=9$ nhưng $2^2+1^2=5$.',
    [eq(e, 0) for e in _id])

# ----------------------------- THÔNG HIỂU ----------------------------------
num_q('H', 'Tính nhanh $101^2$.', 10201, [10101, 10201, 10001, 10200],
      '$101^2=(100+1)^2=100^2+2\\cdot 100\\cdot 1+1^2=10000+200+1=10201$.')

num_q('H', 'Tính nhanh $49\\cdot 51$.', 2499, [2501, 2449, 2499, 2500],
      '$49\\cdot 51=(50-1)(50+1)=50^2-1^2=2500-1=2499$.')

_fill = [('5x', 'x**2+5*x+25'), ('10x', 'x**2+10*x+25'), ('25x', 'x**2+25*x+25'), ('x', 'x**2+x+25')]
mcq('H', 'Biểu thức thích hợp điền vào chỗ trống: $x^2+\\ldots+25=(x+5)^2$ là', ['$' + l + '$' for l, _ in _fill], 1,
    '$(x+5)^2=x^2+2\\cdot x\\cdot 5+5^2=x^2+10x+25$.\\\\ Vậy chỗ trống là hạng tử $2AB=10x$.',
    [eq(s, '(x+5)**2') for _, s in _fill])

expr_q('H', 'Rút gọn biểu thức $(x+2)^2-(x-2)^2$ ta được', '(x+2)**2-(x-2)**2', [
    ('0', '0'), ('4x', '4*x'), ('2x^2+8', '2*x**2+8'), ('8x', '8*x')],
    'Cách 1: $(x^2+4x+4)-(x^2-4x+4)=8x$.\\\\ Cách 2 (hiệu hai bình phương): $\\big[(x+2)-(x-2)\\big]\\big[(x+2)+(x-2)\\big]=4\\cdot 2x=8x$.')

expr_q('H', 'Khai triển $(x-1)^3$ ta được', '(x-1)**3', [
    ('x^3-1', 'x**3-1'), ('x^3-3x^2+3x-1', 'x**3-3*x**2+3*x-1'), ('x^3-3x^2-3x-1', 'x**3-3*x**2-3*x-1'), ('x^3+3x^2-3x-1', 'x**3+3*x**2-3*x-1')],
    'Lập phương của một hiệu: $(A-B)^3=A^3-3A^2B+3AB^2-B^3$ (dấu đan xen $+,-,+,-$).\\\\ $(x-1)^3=x^3-3x^2+3x-1$.')

expr_q('H', 'Viết biểu thức $9x^2-12xy+4y^2$ dưới dạng bình phương của một hiệu.', '9*x**2-12*x*y+4*y**2', [
    ('(3x+2y)^2', '(3*x+2*y)**2'), ('(9x-4y)^2', '(9*x-4*y)**2'), ('(3x-2y)^2', '(3*x-2*y)**2'), ('(3x-4y)^2', '(3*x-4*y)**2')],
    '$9x^2=(3x)^2$, $4y^2=(2y)^2$ và $12xy=2\\cdot 3x\\cdot 2y$.\\\\ Vậy $9x^2-12xy+4y^2=(3x-2y)^2$.')

# ----------------------------- VẬN DỤNG ------------------------------------
_v = (x**2 - 6*x + 9).subs(x, 103)
num_q('V', 'Giá trị của biểu thức $x^2-6x+9$ tại $x=103$ là', _v, [9409, 10609, 100, 10000],
      '$x^2-6x+9=(x-3)^2$.\\\\ Tại $x=103$: $(103-3)^2=100^2=10000$.')

_sol = solve((x + 1)**2 - (x - 1)*(x + 1) - 6, x)
assert _sol == [2]
num_q('V', 'Tìm $x$, biết $(x+1)^2-(x-1)(x+1)=6$.', 2, [3, -2, 2, 1],
      '$(x+1)^2-(x-1)(x+1)=(x^2+2x+1)-(x^2-1)=2x+2$.\\\\ $2x+2=6\\Rightarrow x=2$.', fmt=lambda v: '$x=' + str(v) + '$')

_m = smin(x**2 - 4*x + 7, x, S.Reals)
num_q('V', 'Giá trị nhỏ nhất của biểu thức $A=x^2-4x+7$ là', _m, [7, 3, -4, 2],
      '$A=x^2-4x+4+3=(x-2)^2+3\\ge 3$ vì $(x-2)^2\\ge 0$.\\\\ Dấu "=" xảy ra khi $x=2$. Vậy giá trị nhỏ nhất của $A$ là $3$.')

expr_q('V', 'Rút gọn biểu thức $(x+3)(x^2-3x+9)-x^3$ ta được', '(x+3)*(x**2-3*x+9)-x**3', [
    ('27', '27'), ('-27', '-27'), ('54', '54'), ('2x^3+27', '2*x**3+27')],
    'Tổng hai lập phương: $(x+3)(x^2-3x+9)=x^3+27$.\\\\ Do đó biểu thức bằng $x^3+27-x^3=27$.')

# a+b=5, ab=6 -> a^2+b^2
_r = [(2, 3)]
assert all(p + q == 5 and p*q == 6 for p, q in _r)
num_q('V', 'Cho $a+b=5$ và $ab=6$. Giá trị của $a^2+b^2$ là', 2**2 + 3**2, [25, 37, 19, 13],
      '$a^2+b^2=(a+b)^2-2ab=5^2-2\\cdot 6=25-12=13$.')

num_q('V', 'Tính nhanh $\\dfrac{63^2-37^2}{26}$.', Rational(63**2 - 37**2, 26), [100, 26, 50, 2600],
      '$63^2-37^2=(63-37)(63+37)=26\\cdot 100$.\\\\ Vậy $\\dfrac{26\\cdot 100}{26}=100$.')

# ----------------------------- VẬN DỤNG CAO --------------------------------
# a+b=3, ab=2 -> a,b = 1,2
num_q('T', 'Cho $a+b=3$ và $ab=2$. Giá trị của $a^3+b^3$ là', 1 + 8, [27, 9, 35, 15],
      '$a^3+b^3=(a+b)^3-3ab(a+b)=3^3-3\\cdot 2\\cdot 3=27-18=9$.\\\\ (Kiểm tra: $a=1,\\ b=2$ thì $1+8=9$.)')

# x-y=2, xy=15 -> (5,3) or (-3,-5)
assert 5**3 - 3**3 == (-3)**3 - (-5)**3 == 98
num_q('T', 'Cho $x-y=2$ và $xy=15$. Giá trị của $x^3-y^3$ là', 98, [8, 38, 98, 62],
      '$x^3-y^3=(x-y)^3+3xy(x-y)=2^3+3\\cdot 15\\cdot 2=8+90=98$.')

_M = smax(-x**2 + 6*x - 1, x, S.Reals)
num_q('T', 'Giá trị lớn nhất của biểu thức $B=-x^2+6x-1$ là', _M, [-1, 3, 10, 8],
      '$B=-(x^2-6x+9)+8=8-(x-3)^2\\le 8$.\\\\ Dấu "=" xảy ra khi $x=3$. Vậy giá trị lớn nhất của $B$ là $8$.')

# x + 1/x = 3 -> x^2 + 1/x^2 = 7
_xs = solve(x + 1/x - 3, x)
assert all(simplify(s**2 + 1/s**2 - 7) == 0 for s in _xs)
num_q('T', 'Cho $x+\\dfrac{1}{x}=3$. Giá trị của $x^2+\\dfrac{1}{x^2}$ là', 7, [9, 7, 11, 5],
      '$\\left(x+\\dfrac1x\\right)^2=x^2+2+\\dfrac{1}{x^2}$.\\\\ Suy ra $x^2+\\dfrac{1}{x^2}=3^2-2=7$.')

_f = x**2 + y**2 - 2*x + 4*y + 5
_pairs = [(1, -2), (-1, 2), (1, 2), (2, -1)]
mcq('T', 'Tìm $x,\\ y$ thỏa mãn $x^2+y^2-2x+4y+5=0$.', ['$x=%d,\\ y=%d$' % p for p in _pairs], 0,
    '$x^2-2x+1+y^2+4y+4=0\\Leftrightarrow (x-1)^2+(y+2)^2=0$.\\\\ Tổng hai bình phương bằng $0$ khi cả hai bằng $0$: $x=1,\\ y=-2$.',
    [_f.subs({x: p, y: q}) == 0 for p, q in _pairs])
assert expand((x - 1)**2 + (y + 2)**2 - _f) == 0

# (n+2)^2-(n-2)^2 = 8n luôn chia hết cho?
_e = expand((n + 2)**2 - (n - 2)**2)
assert _e == 8*n
_cands = [16, 8, 6, 5]
mcq('T', 'Với mọi số nguyên $n$, biểu thức $(n+2)^2-(n-2)^2$ luôn chia hết cho số nào dưới đây?', ['$%d$' % c for c in _cands], 1,
    '$(n+2)^2-(n-2)^2=\\big[(n+2)-(n-2)\\big]\\big[(n+2)+(n-2)\\big]=4\\cdot 2n=8n$, luôn chia hết cho $8$.\\\\ Các số $16,\\ 6,\\ 5$ không đúng với mọi $n$, chẳng hạn $n=1$ cho giá trị $8$.',
    [all((8*k) % c == 0 for k in range(-30, 31)) for c in _cands])

# ------------------------------------------------------------------- output
order = {'N': 0, 'H': 1, 'V': 2, 'T': 3}
assert [order[q['level']] for q in Q] == sorted(order[q['level']] for q in Q)
questions = []
for i, q in enumerate(Q, 1):
    questions.append({
        'id': '%s::hdt%02d' % (TOPIC, i), 'topicId': TOPIC, 'grade': 8, 'level': q['level'], 'status': 'ok',
        'prompt': q['prompt'], 'source': SRC,
        'irt': {'a': 1.2, 'b': IRT_B[q['level']] + (0.15 * ((i - 1) % 6) - 0.375), 'c': 0.25},
        'tikzSources': [], 'tikzHashes': [], 'hasTable': False, 'hasImmini': False,
        'solution': q['solution'], 'type': 'mcq',
        'options': [{'label': 'ABCD'[k], 'content': o, 'isCorrect': k == q['correct']} for k, o in enumerate(q['options'])],
    })
for q in questions:
    q['irt']['b'] = round(q['irt']['b'], 3)

def blk(t, content, title=None, solution=None):
    return {'type': t, 'content': content, 'title': title, 'solution': solution, 'tikzSources': [], 'tikzHashes': []}

knowledge = [
    blk('section', '1. Bình phương của một tổng, một hiệu'),
    blk('dn', 'Với $A,\\ B$ là hai số hoặc hai biểu thức bất kì:'
        '$$\\begin{aligned}(A+B)^2&=A^2+2AB+B^2 &&(1)\\\\(A-B)^2&=A^2-2AB+B^2 &&(2)\\end{aligned}$$',
        'Bình phương của một tổng và của một hiệu'),
    blk('dn', '$$A^2-B^2=(A-B)(A+B) \\qquad (3)$$', 'Hiệu hai bình phương'),
    blk('section', '2. Lập phương của một tổng, một hiệu'),
    blk('dn', '$$\\begin{aligned}(A+B)^3&=A^3+3A^2B+3AB^2+B^3 &&(4)\\\\(A-B)^3&=A^3-3A^2B+3AB^2-B^3 &&(5)\\end{aligned}$$',
        'Lập phương của một tổng và của một hiệu'),
    blk('section', '3. Tổng và hiệu hai lập phương'),
    blk('dn', '$$\\begin{aligned}A^3+B^3&=(A+B)(A^2-AB+B^2) &&(6)\\\\A^3-B^3&=(A-B)(A^2+AB+B^2) &&(7)\\end{aligned}$$',
        'Tổng hai lập phương và hiệu hai lập phương'),
    blk('nx', '<strong>Mẹo nhớ.</strong> Bình phương có 3 hạng tử, hệ số $1,\\ 2,\\ 1$. Lập phương có 4 hạng tử, hệ số $1,\\ 3,\\ 3,\\ 1$; '
        'với $(A-B)^3$ dấu đan xen $+,-,+,-$.\\\\ Ở (6) và (7), ngoặc thứ hai là "bình phương thiếu": giống bình phương nhưng hạng tử giữa là $AB$ chứ không phải $2AB$, '
        'và dấu của nó ngược với dấu ở ngoặc thứ nhất.', 'Cách nhớ nhanh'),
    blk('chuy', '<strong>Ba lỗi hay gặp:</strong>\\\\ • Viết $(a+b)^2=a^2+b^2$ — thiếu hạng tử $2ab$.\\\\ • Viết $(2x)^2=2x^2$ — phải là $4x^2$.\\\\ '
        '• Nhầm $A^3-B^3$ với $(A-B)^3$: $x^3-8=(x-2)(x^2+2x+4)$, còn $(x-2)^3=x^3-6x^2+12x-8$.', 'Sai lầm cần tránh'),
    blk('section', '4. Ví dụ mẫu'),
    blk('vd', 'Khai triển $(2x+3y)^2$.', 'Ví dụ 1',
        'Áp dụng (1) với $A=2x,\\ B=3y$:\\\\ $(2x+3y)^2=(2x)^2+2\\cdot 2x\\cdot 3y+(3y)^2=4x^2+12xy+9y^2$.'),
    blk('vd', 'Tính nhanh: a) $99^2$; b) $98\\cdot 102$.', 'Ví dụ 2',
        'a) $99^2=(100-1)^2=10000-200+1=9801$.\\\\ b) $98\\cdot 102=(100-2)(100+2)=100^2-2^2=9996$.'),
    blk('vd', 'Viết $8x^3-27$ thành tích.', 'Ví dụ 3',
        '$8x^3=(2x)^3$, $27=3^3$. Áp dụng (7):\\\\ $8x^3-27=(2x-3)\\big[(2x)^2+2x\\cdot 3+3^2\\big]=(2x-3)(4x^2+6x+9)$.'),
    blk('vd', 'Rút gọn rồi tính giá trị của $P=(x-1)^3-x(x-3)^2$ tại $x=-2$.', 'Ví dụ 4',
        '$P=(x^3-3x^2+3x-1)-x(x^2-6x+9)=x^3-3x^2+3x-1-x^3+6x^2-9x=3x^2-6x-1$.\\\\ Tại $x=-2$: $P=3\\cdot 4+12-1=23$.'),
]
# kiểm tra các ví dụ mẫu
assert expand((2*x + 3*y)**2) == 4*x**2 + 12*x*y + 9*y**2
assert 99**2 == 9801 and 98*102 == 9996
assert expand((2*x - 3)*(4*x**2 + 6*x + 9)) == 8*x**3 - 27
assert expand((x - 1)**3 - x*(x - 3)**2) == 3*x**2 - 6*x - 1 and (3*x**2 - 6*x - 1).subs(x, -2) == 23
assert expand((x - 2)**3) == x**3 - 6*x**2 + 12*x - 8

method = [
    blk('dang', 'Nhận dạng $A$, $B$ rồi áp dụng đúng công thức. Viết rõ bước trung gian như $(2x)^2$, $2\\cdot 2x\\cdot 3y$ để không sót hệ số.',
        'Dạng 1. Khai triển biểu thức', 'Ví dụ: $(3x-2)^2=(3x)^2-2\\cdot 3x\\cdot 2+2^2=9x^2-12x+4$.'),
    blk('dang', 'Đếm số hạng tử: 3 hạng tử thì thử dạng bình phương $A^2\\pm 2AB+B^2$; 2 hạng tử bậc hai thì thử hiệu hai bình phương; '
        '2 hạng tử bậc ba thì thử tổng/hiệu hai lập phương; 4 hạng tử với hệ số $1,3,3,1$ thì thử lập phương.',
        'Dạng 2. Viết thành bình phương, lập phương hoặc tích', 'Ví dụ: $x^2+8x+16=(x+4)^2$; $\\ 27-x^3=(3-x)(9+3x+x^2)$.'),
    blk('dang', 'Tách số thành tổng/hiệu với một số tròn chục, tròn trăm rồi áp dụng hằng đẳng thức.',
        'Dạng 3. Tính nhanh', 'Ví dụ: $201^2=(200+1)^2=40401$; $\\ 47\\cdot 53=50^2-3^2=2491$.'),
    blk('dang', 'Khai triển các hằng đẳng thức, thu gọn hạng tử đồng dạng rồi mới thay số. Biểu thức sau khi rút gọn không còn $x$ thì nó không phụ thuộc vào biến.',
        'Dạng 4. Rút gọn và tính giá trị biểu thức', 'Ví dụ: $(x+1)^2-(x-1)^2-4x=4x-4x=0$ với mọi $x$.'),
    blk('dang', 'Đưa về dạng $(\\ldots)^2+m$ (giá trị nhỏ nhất là $m$) hoặc $m-(\\ldots)^2$ (giá trị lớn nhất là $m$), rồi chỉ ra giá trị của biến để dấu "=" xảy ra. '
        'Biết $a+b$ và $ab$ thì dùng $a^2+b^2=(a+b)^2-2ab$, $a^3+b^3=(a+b)^3-3ab(a+b)$.',
        'Dạng 5 (nâng cao). Giá trị nhỏ nhất, lớn nhất; biểu thức đối xứng', 'Ví dụ: $x^2+2x+5=(x+1)^2+4\\ge 4$, nhỏ nhất bằng $4$ khi $x=-1$.'),
]
assert 201**2 == 40401 and 47*53 == 2491 and expand((3*x - 2)**2) == 9*x**2 - 12*x + 4
assert expand((3 - x)*(9 + 3*x + x**2)) == 27 - x**3 and expand((x + 4)**2) == x**2 + 8*x + 16
assert expand((x + 1)**2 + 4) == x**2 + 2*x + 5

theory = {'topicId': TOPIC, 'knowledgeBlocks': knowledge, 'methodBlocks': method}

js = """/**
 * Nội dung dùng thử: "Hằng đẳng thức đáng nhớ" (Toán 8, Chương II).
 *
 * File được sinh bởi gen_hdt.py — mọi đáp án và ví dụ đã được kiểm bằng
 * sympy. Nạp ngay sau data/questions.js: thay toàn bộ câu hỏi và lý thuyết
 * của chủ đề %(topic)s bằng bộ biên soạn lại (lý thuyết đủ 7 hằng đẳng thức,
 * %(n)d câu trắc nghiệm tăng dần từ nhận biết đến vận dụng cao).
 */
(function () {
  'use strict';
  var BANK = window.AM_QUESTION_BANK;
  if (!BANK || !Array.isArray(BANK.questions)) return;
  var TOPIC = %(topic_js)s;
  var QUESTIONS = %(questions)s;
  var THEORY = %(theory)s;

  BANK.questions = BANK.questions.filter(function (q) { return q.topicId !== TOPIC; }).concat(QUESTIONS);
  BANK.theory = (BANK.theory || []).filter(function (t) { return t.topicId !== TOPIC; }).concat([THEORY]);
  BANK.totalCount = BANK.questions.length;
  window.AM_FEATURED = { topicId: TOPIC, questionCount: QUESTIONS.length };
})();
""" % dict(topic=TOPIC, n=len(questions), topic_js=json.dumps(TOPIC),
           questions=json.dumps(questions, ensure_ascii=False, indent=1),
           theory=json.dumps(theory, ensure_ascii=False, indent=1))
open(sys.argv[1], 'w', encoding='utf-8').write(js)
print('OK', len(questions), 'questions;', {lv: sum(1 for q in questions if q['level'] == lv) for lv in 'NHVT'},
      'correct positions:', ''.join('ABCD'[q['correct']] for q in Q))
