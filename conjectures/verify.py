"""Numerical checks for the companion note `proofs.tex`.

Every counterexample and every numerical claim in the note is reproduced here.
Run:  python3 verify.py      (needs numpy and scipy; runs in well under a minute)

Notation follows the proposal "A Bayesian Algorithm for Optimal Dating Expenditure".
Core model: independent priors, value after the date truncated after one more
date (eqs. 19-21), q_D known, ratings y ~ Binomial(m_j, C) with exact Bayes updating.
"""
import itertools
import math

import numpy as np
from scipy.optimize import brentq
from scipy.special import betaln, comb

rng = np.random.default_rng(20261030)
FAILS = []


def check(name, cond, detail=""):
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"   [{detail}]" if detail else ""))
    if not cond:
        FAILS.append(name)


# ----------------------------------------------------------------------------
# Stings (Table 2): expected feeling per unit of stake
# ----------------------------------------------------------------------------
def kappa(p, model, eta, Lam=2.0):
    if model == "D1":
        return eta * (1 - p)
    if model == "D2":
        return eta * p * (1 - p)
    if model == "KR":
        return eta * (Lam - 1) * p * (1 - p)
    raise ValueError(model)


def phat(p, st):
    """Effective continuation weight p - kappa(p) (Lemma 2 of the note)."""
    return p - kappa(p, *st)


# ----------------------------------------------------------------------------
# Beliefs about C: two types or Beta, with Binomial(m, C) ratings
# ----------------------------------------------------------------------------
class TwoType:
    def __init__(self, cL, cH):
        self.cL, self.cH = cL, cH

    def E(self, f, pi):
        return pi * f(self.cH) + (1 - pi) * f(self.cL)

    def mean(self, pi):
        return pi * self.cH + (1 - pi) * self.cL

    def signal(self, pi, m):
        """List of (prob, posterior) for y ~ Bin(m, C)."""
        out = []
        for y in range(m + 1):
            lH = comb(m, y) * self.cH**y * (1 - self.cH) ** (m - y)
            lL = comb(m, y) * self.cL**y * (1 - self.cL) ** (m - y)
            pr = pi * lH + (1 - pi) * lL
            if pr > 0:
                out.append((pr, pi * lH / pr))
        return out


class BetaB:
    """Belief is (alpha, beta)."""

    def moment(self, b, k):
        a, bb = b
        r = 1.0
        for i in range(k):
            r *= (a + i) / (a + bb + i)
        return r

    def E_poly(self, coeffs, b):
        return sum(c * self.moment(b, k) for k, c in enumerate(coeffs))

    def mean(self, b):
        return b[0] / (b[0] + b[1])

    def signal(self, b, m):
        a, bb = b
        out = []
        for y in range(m + 1):
            pr = comb(m, y) * math.exp(betaln(a + y, bb + m - y) - betaln(a, bb))
            out.append((pr, (a + y, bb + m - y)))
        return out


# ----------------------------------------------------------------------------
# After-date value (eqs. 19-21) with q_D known:
#   V_end(b) = E_b[a(C)] + kt * max(0, E_b[psi(C)])
#   a(c)   = h c R + (1-h) U,  h = hbar qD c
#   psi(c) = (1-h) [ dD (h c R + (1-h) U) - U ]
#   kt     = (qD - kappa(qD))^+
# ----------------------------------------------------------------------------
def a_fun(P):
    def a(c):
        h = P["hbar"] * P["qD"] * c
        return h * c * P["R"] + (1 - h) * P["U"]
    return a


def psi_fun(P):
    def psi(c):
        h = P["hbar"] * P["qD"] * c
        return (1 - h) * (P["dD"] * (h * c * P["R"] + (1 - h) * P["U"]) - P["U"])
    return psi


def poly_coeffs(f, deg=4):
    """Exact coefficients of a polynomial f of degree <= deg (via interpolation)."""
    xs = np.linspace(0, 1, deg + 1)
    return np.polynomial.polynomial.polyfit(xs, [f(x) for x in xs], deg)


def kt(P):
    return max(0.0, P["qD"] - kappa(P["qD"], *P["sting"]))


# ----------------------------------------------------------------------------
# On-the-day recursion with q known (one-dimensional case, Conjecture 1)
#   W_j(b;s) = E[C] v_j (1+ln(1+s/k_j)) - sigma lam (k_j+s),  budget slack
#   G_j(b)   = max_s W_j(b;s) - c_j + E[V_{j+1}(b')|b] - V_end(b)
#   V_j(b)   = V_end(b) + phat_j^+ G_j^+
# ----------------------------------------------------------------------------
def Wstar(mu, st, P):
    v, k = st["v"], st["k"]
    sl = P["sigma"] * P["lam"]
    s = max(mu * v / sl - k, 0.0)
    return mu * v * (1 + math.log1p(s / k)) - sl * (k + s)


class Day:
    def __init__(self, P, fam):
        self.P, self.fam = P, fam
        self.kt = kt(P)
        self.cache = {}
        if isinstance(fam, TwoType):
            a, psi = a_fun(P), psi_fun(P)
            self.Ea = lambda b: fam.E(a, b)
            self.Epsi = lambda b: fam.E(psi, b)
        else:
            ca, cp = poly_coeffs(a_fun(P)), poly_coeffs(psi_fun(P))
            self.Ea = lambda b: fam.E_poly(ca, b)
            self.Epsi = lambda b: fam.E_poly(cp, b)

    def Vend(self, b):
        return self.Ea(b) + self.kt * max(0.0, self.Epsi(b))

    def I(self, j, b):
        """Investment value of step j: E[V_end(b')|b] - V_end(b)."""
        m = self.P["steps"][j]["m"]
        return sum(pr * self.Vend(bp) for pr, bp in self.fam.signal(b, m)) - self.Vend(b)

    def V(self, j, b):
        J = len(self.P["steps"])
        if j == J:
            return self.Vend(b)
        key = (j, b)
        if key not in self.cache:
            p = self.P["steps"][j]["phi"] * self.P["q"]
            ph = max(0.0, phat(p, self.P["sting"]))
            self.cache[key] = self.Vend(b) + ph * max(0.0, self.G(j, b))
        return self.cache[key]

    def G(self, j, b):
        st = self.P["steps"][j]
        cont = sum(pr * self.V(j + 1, bp) for pr, bp in self.fam.signal(b, st["m"]))
        return Wstar(self.fam.mean(b), st, self.P) - st["c"] + cont - self.Vend(b)

    def asks(self, j, b):
        p = self.P["steps"][j]["phi"] * self.P["q"]
        return phat(p, self.P["sting"]) > 0 and self.G(j, b) >= 0


def sign_changes(arr, tol=1e-9):
    s = np.sign(np.where(np.abs(arr) < tol, 0, arr))
    s = s[s != 0]
    return int(np.sum(s[1:] != s[:-1]))


# ============================================================================
print("\nConjecture 1 -- threshold rules")
# ============================================================================
P1 = dict(sigma=1.0, lam=1.0, q=0.9, qD=0.8, hbar=0.5, dD=0.9, R=6000.0, U=1000.0,
          sting=("D1", 0.2),
          steps=[dict(v=50.0, k=30.0, c=0.0, phi=1.0, m=1)])
fam = TwoType(0.2, 0.8)
day = Day(P1, fam)
psi = psi_fun(P1)
xL, xH = psi(0.2), psi(0.8)
pik = -xL / (xH - xL)
print(f"  psi(C_L)={xL:.3f}  psi(C_H)={xH:.3f}  Phase-C kink pi_k={pik:.4f}  kt={day.kt:.3f}")
grid = np.linspace(0.0005, 0.9995, 1999)
G = np.array([day.G(0, x) for x in grid])
ask = np.array([day.asks(0, x) for x in grid])
runs = [(grid[i], ask[i]) for i in range(len(grid)) if i == 0 or ask[i] != ask[i - 1]]
print("  ask region switches at pi =", [f"{x:.3f}:{'ask' if a else 'end'}" for x, a in runs])
for x in [0.05, pik, 0.2, 0.4, 0.6, 0.7, 0.9]:
    print(f"    pi={x:.4f}  E[C]={fam.mean(x):.3f}  G={day.G(0, x):9.3f}  I={day.I(0, x):8.3f}  ask={day.asks(0, x)}")
roots = [brentq(lambda x: day.G(0, x), lo, hi) for lo, hi in [(0.05, 0.1), (0.2, 0.3), (0.6, 0.7)]]
print("  exact switch points (bisection):", [f"{r:.4f}" for r in roots])
check("C1 counterexample: G changes sign 3 times (ask set not an interval)", sign_changes(G) == 3,
      f"{sign_changes(G)} changes")
check("C1 counterexample: two-type sufficient condition (Cor. b) is violated",
      50 * (0.8 - 0.2) < day.kt * abs(xH - xL), f"{50*0.6:.1f} < {day.kt*abs(xH-xL):.1f}")

# Threshold theorem / corollary (b): random two-type models satisfying the condition.
ok, tested = True, 0
for t in range(400):
    cL, cH = sorted(rng.uniform(0, 1, 2))
    J = int(rng.integers(1, 4))
    steps = [dict(v=float(rng.uniform(10, 200)), k=float(rng.uniform(5, 60)),
                  c=float(rng.uniform(0, 20)), phi=float(1.0 if j == 0 else rng.uniform(0.3, 1)),
                  m=int(rng.integers(1, 5))) for j in range(J)]
    P = dict(sigma=float(rng.choice([0.5, 1.0])), lam=float(rng.uniform(0.5, 2)), q=float(rng.uniform(0.3, 1)),
             qD=float(rng.uniform(0.2, 1)), hbar=float(rng.uniform(0.1, 1)), dD=float(rng.uniform(0.5, 0.99)),
             R=float(rng.uniform(0, 3000)), U=float(rng.uniform(0, 800)),
             sting=(str(rng.choice(["D1", "D2", "KR"])), float(rng.uniform(0, 3))), steps=steps)
    d = Day(P, TwoType(cL, cH))
    ps = psi_fun(P)
    if not all(s["v"] * (cH - cL) >= d.kt * abs(ps(cH) - ps(cL)) for s in steps):
        continue
    tested += 1
    for j in range(J):
        g = np.array([d.G(j, x) for x in np.linspace(0.001, 0.999, 300)])
        if np.any(np.diff(g) < -1e-7):
            ok = False
print(f"  random two-type models satisfying corollary (b): {tested}")
check("Threshold corollary (b), two types: G_j nondecreasing in pi at every step whenever the condition holds", ok and tested > 50)

# Threshold corollary (c), Beta family: X_n(alpha) nondecreasing and kt*slope <= v_j  =>  G_j nondecreasing.
ok, tested = True, 0
fb = BetaB()
for t in range(150):
    J = int(rng.integers(1, 3))
    steps = [dict(v=float(rng.uniform(20, 200)), k=float(rng.uniform(5, 60)), c=float(rng.uniform(0, 20)),
                  phi=1.0 if j == 0 else float(rng.uniform(0.3, 1)), m=int(rng.integers(1, 4))) for j in range(J)]
    P = dict(sigma=1.0, lam=float(rng.uniform(0.5, 2)), q=float(rng.uniform(0.3, 1)), qD=float(rng.uniform(0.2, 1)),
             hbar=float(rng.uniform(0.1, 0.5)), dD=float(rng.uniform(0.3, 0.6)), R=float(rng.uniform(0, 400)),
             U=float(rng.uniform(0, 200)), sting=("D2", float(rng.uniform(0, 3))), steps=steps)
    d = Day(P, fb)
    cs = np.linspace(0, 1, 2001)
    pv = np.array([psi_fun(P)(c) for c in cs])
    if np.any(np.diff(pv) < 0):
        continue           # corollary (c) is stated for nondecreasing psi
    slope = np.max(np.diff(pv) / np.diff(cs))
    if not all(s["v"] >= d.kt * slope for s in steps):
        continue
    tested += 1
    n0 = float(rng.uniform(2, 10))
    for j in range(J):
        n = n0 + sum(s["m"] for s in steps[:j])
        g = np.array([d.G(j, (n * u, n * (1 - u))) for u in np.linspace(0.02, 0.98, 120)])
        if np.any(np.diff(g) < -1e-7):
            ok = False
print(f"  random Beta models satisfying corollary (c): {tested}")
check("Threshold corollary (c), Beta: G_j nondecreasing in E[C] (Beta, fixed n) whenever the condition holds", ok and tested > 20)

# ============================================================================
print("\nConjectures 2 and 3 -- outside option and relationship value (pivotality lemma)")
# ============================================================================
def G_at(P, x, j=0, fam=fam):
    return Day(P, fam).G(j, x)


def Psi_at(P, x, fam=fam):
    return Day(P, fam).Epsi(x)


for name, key, step in [("U", "U", 50.0), ("R", "R", 300.0)]:
    agree, tested = True, 0
    for t in range(300):
        cL, cH = sorted(rng.uniform(0, 1, 2))
        f2 = TwoType(cL, cH)
        J = int(rng.integers(1, 3))
        steps = [dict(v=float(rng.uniform(10, 200)), k=float(rng.uniform(5, 60)), c=float(rng.uniform(0, 20)),
                      phi=1.0 if j == 0 else float(rng.uniform(0.3, 1)), m=int(rng.integers(1, 4))) for j in range(J)]
        P = dict(sigma=1.0, lam=1.0, q=float(rng.uniform(0.3, 1)), qD=float(rng.uniform(0.3, 1)),
                 hbar=float(rng.uniform(0.1, 1)), dD=float(rng.uniform(0.5, 0.99)), R=float(rng.uniform(500, 8000)),
                 U=float(rng.uniform(100, 1500)), sting=(str(rng.choice(["D1", "D2", "KR"])), float(rng.uniform(0, 2))),
                 steps=steps)
        P2 = dict(P)
        P2[key] = P[key] + step
        for x in np.linspace(0.02, 0.98, 25):
            dG = G_at(P2, x, fam=f2) - G_at(P, x, fam=f2)
            lo, hi = sorted([Psi_at(P, x, f2), Psi_at(P2, x, f2)])
            if lo > 0:          # Phase-C 'ask' at both parameter values
                tested += 1
                want = dG >= -1e-8 if key == "U" else dG <= 1e-8
            elif hi <= 0:       # Phase-C 'cut' at both parameter values
                tested += 1
                want = dG <= 1e-8 if key == "U" else dG >= -1e-8
            else:
                continue
            agree &= bool(want)
    check(f"Pivotality lemma sign pattern for {name} on random models ({tested} belief points)", agree and tested > 500)

# Explicit counterexamples on the Conjecture-1 model.
x = 0.20
PU = dict(P1, U=P1["U"] + 20)
PR = dict(P1, R=P1["R"] + 100)
g0, gU, gR = G_at(P1, x), G_at(PU, x), G_at(PR, x)
print(f"  at pi={x}: Psi={Psi_at(P1, x):.2f} (ask after date), G={g0:.3f}, G(U+20)={gU:.3f}, G(R+100)={gR:.3f}")
check("C2 counterexample: higher U raises G (lowers the continuation threshold)", gU > g0)
check("C3 counterexample: higher R lowers G (raises the continuation threshold)", gR < g0)
x = 0.07
print(f"  at pi={x}: Psi={Psi_at(P1, x):.2f} (cut after date), G={G_at(P1, x):.3f}, "
      f"G(U+20)={G_at(PU, x):.3f}, G(R+100)={G_at(PR, x):.3f}")
check("C2 holds where Phase C cuts: higher U lowers G", G_at(PU, x) < G_at(P1, x))
check("C3 holds where Phase C cuts: higher R raises G", G_at(PR, x) > G_at(P1, x))

# Threshold movement: find the switch point of the ask set just above pi_k in the C1 model.
def switch_points(P):
    g = np.array([G_at(P, x) for x in grid])
    return [grid[i] for i in range(1, len(grid)) if np.sign(g[i]) != np.sign(g[i - 1])]


print("  switch points of the ask set (U):", [f"{v:.4f}" for v in switch_points(P1)],
      "->", [f"{v:.4f}" for v in switch_points(PU)])

# A model that satisfies corollary (b) (so the ask set is a threshold), threshold moves the "wrong" way.
P2 = dict(P1, R=600.0, U=100.0, steps=[dict(v=100.0, k=32.0, c=0.0, phi=1.0, m=1)])
d2 = Day(P2, fam)
ps2 = psi_fun(P2)
print(f"  threshold model (corollary (b) checked at base; single crossing checked numerically for each shift): v(C_H-C_L)={100*0.6:.1f} >= kt|psi(C_H)-psi(C_L)|={d2.kt*abs(ps2(0.8)-ps2(0.2)):.2f}")
check("threshold model satisfies corollary (b) at the base parameters", 100 * 0.6 >= d2.kt * abs(ps2(0.8) - ps2(0.2)))
fine = np.linspace(0.0005, 0.9995, 19991)


def threshold(P):
    g = np.array([G_at(P, x) for x in fine])
    assert sign_changes(g) == 1, "not a threshold"
    i = int(np.argmax(g >= 0))
    return brentq(lambda x: G_at(P, x), fine[i - 1], fine[i])


t0 = threshold(P2)
tU = threshold(dict(P2, U=P2["U"] + 5))
tR = threshold(dict(P2, R=P2["R"] + 30))
print(f"  threshold pi*: base {t0:.4f} (Psi there {Psi_at(P2, t0):.2f} > 0), U+5 -> {tU:.4f}, R+30 -> {tR:.4f}")
check("C2 counterexample in a threshold model: higher U lowers the threshold", tU < t0 - 1e-3)
check("C3 counterexample in a threshold model: higher R raises the threshold", tR > t0 + 1e-3)
P3 = dict(P2, steps=[dict(v=100.0, k=25.0, c=0.0, phi=1.0, m=1)])
t0b, tUb = threshold(P3), threshold(dict(P3, U=P3["U"] + 5))
tRb = threshold(dict(P3, R=P3["R"] + 30))
print(f"  threshold pi* (k=25): base {t0b:.4f} (Psi there {Psi_at(P3, t0b):.2f} < 0), U+5 -> {tUb:.4f}, R+30 -> {tRb:.4f}")
check("C2/C3 hold where Phase C cuts: higher U raises, higher R lowers the threshold", tUb > t0b and tRb < t0b)

# Investment share (Conjecture 3, second part)
I_half, I_k = day.I(0, 0.5), day.I(0, pik)
print(f"  investment value I(1/2)={I_half:.4f}, I(pi_k)={I_k:.4f}")
check("C3(ii) counterexample: investment value zero at maximal uncertainty, positive at the kink",
      abs(I_half) < 1e-9 and I_k > 1)
Is = np.array([day.I(0, x) for x in grid])
imax = grid[np.argmax(Is)]
check("Investment-value proposition (ii): unimodal with peak at the Phase-C kink",
      sign_changes(np.diff(Is)) <= 1 and abs(imax - pik) < 2e-3, f"argmax {imax:.4f} vs pi_k {pik:.4f}")
# settling: Beta with growing n at fixed mean near the Phase-C kink in mean
dB = Day(P1, fb)
vals = [dB.I(0, (n * 0.3, n * 0.7)) for n in [2, 8, 32, 128, 512, 2048]]
print("  Beta, mean 0.3, I at n=2..2048:", [f"{v:.3f}" for v in vals])
check("Investment-value proposition (iii): investment value -> 0 as beliefs settle", vals[-1] < 0.05 * max(vals))
ns = [1, 2, 4, 8, 16, 32, 64]
nonmono = [dB.I(0, (n * 0.3, n * 0.7)) for n in ns]
print("  Beta, mean 0.3, I at n=1..64:", [f"{v:.3f}" for v in nonmono])
check("I at fixed mean is not monotone in n: I(n=16) > I(n=8)", nonmono[4] > nonmono[3] + 0.5)

# ============================================================================
print("\nConjecture 4 -- tight budgets")
# ============================================================================
# (a) V(B) jumps at the entry price: not concave
#     One step left, s*=0, step worth w>0 net at entry price k: V(B) = Vend + w 1{B>=k}
w, k = 12.0, 30.0
VB = lambda B: (w if B >= k else 0.0)
check("V(B) is not concave when a step with positive net value has an entry price",
      VB(k) - VB(k - 1) > VB(k - 1) - VB(k - 2))


# (b) opening choice is not monotone in the budget.  C known, q=1, eta=0, sigma=lam=1,
#     optimal discretionary spend subject to the budget (W_j(s) = x(1+ln(1+s/k)) - (k+s)).
def W_budget(x, k, Bleft):
    if Bleft < k:
        return None
    s = min(max(x - k, 0.0), Bleft - k)
    return x * (1 + math.log1p(s / k)) - (k + s)


def open_choice(B, xc=10.0, kc=8.0, xd=60.0, kd=40.0):
    dinner = W_budget(xd, kd, B)
    coffee = None
    if B >= kc:
        best = -np.inf
        for sc in np.linspace(0, B - kc, 2001):
            wc = xc * (1 + math.log1p(sc / kc)) - (kc + sc)
            wd = W_budget(xd, kd, B - kc - sc)
            best = max(best, wc + (max(wd, 0.0) if wd is not None else 0.0))
        coffee = best
    vals = {"coffee": coffee, "dinner": dinner}
    vals = {k: v for k, v in vals.items() if v is not None}
    return max(vals, key=vals.get), vals


for B in [10, 45, 60, 80]:
    c_, v_ = open_choice(B)
    print(f"  B={B}: values {{{', '.join(f'{k}: {v:.3f}' for k, v in v_.items())}}} -> {c_}")
check("C4 counterexample: dinner opening at B=45, coffee opening at B=80",
      open_choice(45)[0] == "dinner" and open_choice(80)[0] == "coffee")


# (c) 'as if money were more expensive': opening choice vs lambda.  W*(x) = x ln(x/(lam k)) if x >= lam k.
def Wstar_closed(x, k, lam):
    return x * math.log(x / (lam * k)) if x >= lam * k else x - lam * k


def open_lambda(lam, xc=10.8, kc=8.0, xd=63.0, kd=40.0):
    Wc, Wd = Wstar_closed(xc, kc, lam), Wstar_closed(xd, kd, lam)
    assert Wd > 0
    return (Wc + Wd) - Wd            # coffee-first minus dinner-first


lam0 = 10.8 / 8.0
print(f"  coffee-first minus dinner-first at lambda=1.30, {lam0}, 1.40:",
      [round(open_lambda(l), 4) for l in (1.30, lam0, 1.40)])
check("C4 counterexample: a higher price of money switches the opening from coffee to dinner",
      open_lambda(1.30) > 0 > open_lambda(1.40))
# closed form of Proposition 1's net value
for x, k, lam in [(25.0, 10.0, 1.0), (63.0, 40.0, 1.3)]:
    s_ = x / lam - k
    direct = x * (1 + math.log1p(s_ / k)) - lam * (k + s_)
    check(f"closed form W* = x ln(x/(sigma lam k)) (x={x}, k={k})", abs(direct - Wstar_closed(x, k, lam)) < 1e-12)


# (d) M2+: thresholds can fall as the budget falls
def G_last(B, wJ=10.0, kJ=20.0, optC=30.0, BD=40.0):
    Vend = lambda b: optC if b >= BD else 0.0
    return wJ + Vend(B - kJ) - Vend(B)


print("  M2+ example G_J(B) at B=30,50,70:", [G_last(B) for B in (30, 50, 70)])
check("M2+: ask at B=30, end at B=50, ask at B=70", G_last(30) > 0 > G_last(50) and G_last(70) > 0)

# (e) core model: G_j nondecreasing in B (budget as a state, discrete venue grid)
def solve_budget(P, fam, Bgrid, sgrid):
    """Core recursion with the budget as a state; spend restricted to sgrid."""
    J = len(P["steps"])
    a, ps = a_fun(P), psi_fun(P)
    ktv = kt(P)
    Vend = lambda b: fam.E(a, b) + ktv * max(0.0, fam.E(ps, b))
    memo = {}

    def V(j, b, B):
        if j == J:
            return Vend(b)
        key = (j, round(b, 12), round(B, 6))
        if key in memo:
            return memo[key]
        st = P["steps"][j]
        p = st["phi"] * P["q"]
        ph = max(0.0, phat(p, P["sting"]))
        g = Gj(j, b, B)
        memo[key] = Vend(b) + (ph * max(0.0, g) if g is not None else 0.0)
        return memo[key]

    def Gj(j, b, B):
        st = P["steps"][j]
        best = None
        for s in sgrid:
            cost = P["sigma"] * (st["k"] + s)
            if cost > B + 1e-12:
                continue
            mu = fam.mean(b)
            Wv = mu * st["v"] * (1 + math.log1p(s / st["k"])) - P["sigma"] * P["lam"] * (st["k"] + s)
            cont = sum(pr * V(j + 1, bp, B - cost) for pr, bp in fam.signal(b, st["m"]))
            val = Wv - st["c"] + cont - Vend(b)
            best = val if best is None or val > best else best
        return best

    return Gj


ok = True
for t in range(40):
    cL, cH = sorted(rng.uniform(0, 1, 2))
    f2 = TwoType(cL, cH)
    steps = [dict(v=float(rng.uniform(20, 120)), k=float(rng.uniform(5, 40)), c=float(rng.uniform(0, 10)),
                  phi=1.0 if j == 0 else float(rng.uniform(0.3, 1)), m=int(rng.integers(1, 3))) for j in range(2)]
    P = dict(sigma=1.0, lam=float(rng.uniform(0.5, 1.5)), q=float(rng.uniform(0.3, 1)), qD=float(rng.uniform(0.3, 1)),
             hbar=float(rng.uniform(0.1, 1)), dD=0.9, R=float(rng.uniform(0, 3000)), U=float(rng.uniform(0, 500)),
             sting=("D1", float(rng.uniform(0, 1))), steps=steps)
    Gj = solve_budget(P, f2, None, [0.0, 5.0, 10.0, 20.0, 40.0])
    for x in [0.2, 0.5, 0.8]:
        vals = [Gj(0, x, B) for B in np.linspace(0, 150, 31)]
        vals = [-1e18 if v is None else v for v in vals]
        if np.any(np.diff(vals) < -1e-8):
            ok = False
check("Budget proposition (iii): core-model G_j(b,B) nondecreasing in B", ok)

# ============================================================================
print("\nConjecture 5 -- spending to learn")
# ============================================================================
# Last step, spend s sharpens a binary signal of accuracy a(s) about the type.
def spend_opt(pi, P=P1, v=50.0, k=20.0, a_max=0.85, s0=20.0):
    ktv = kt(P)
    ps = psi_fun(P)
    xL, xH = ps(fam.cL), ps(fam.cH)
    mu = fam.mean(pi)

    def obj(s):
        a = 0.5 + (a_max - 0.5) * (1 - math.exp(-s / s0))
        X = lambda r: r * xH + (1 - r) * xL
        evsi = ktv * (max(0, pi * a * xH + (1 - pi) * (1 - a) * xL)
                      + max(0, pi * (1 - a) * xH + (1 - pi) * a * xL) - max(0, X(pi)))
        return mu * v * math.log1p(s / k) - P["sigma"] * P["lam"] * s + evsi, evsi

    ss = np.linspace(0, 200, 20001)
    vals = [obj(s)[0] for s in ss]
    s_star = ss[int(np.argmax(vals))]
    s0_ = max(mu * v / (P["sigma"] * P["lam"]) - k, 0.0)
    # gain from asking at s* relative to ending: W(s*) + EVSI(s*)  (last step, budget slack)
    G_star = mu * v * (1 + math.log1p(s_star / k)) - P["sigma"] * P["lam"] * (k + s_star) + obj(s_star)[1]
    return s_star, s0_, G_star


for pi in [pik, 0.5]:
    s_star, s0_, Gs = spend_opt(pi)
    print(f"  pi={pi:.4f}: pi(1-pi)={pi*(1-pi):.3f}  s*={s_star:.2f}  Prop-1 spend={s0_:.2f}  G(s*)={Gs:.2f}")
ss_k, s0_k, G_k = spend_opt(pik)
ss_h, s0_h, G_h = spend_opt(0.5)
check("C5 counterexample: the agent asks at both beliefs (G(s*) > 0)", G_k > 0 and G_h > 0)
check("C5 counterexample: spend premium zero at maximal uncertainty, positive near the kink",
      abs(ss_h - s0_h) < 0.02 and ss_k - s0_k > 1.0)
check("C5 counterexample: accuracy stays below 1 - pi_k", 0.85 < 1 - pik)
prem = [spend_opt(p)[0] - spend_opt(p)[1] for p in np.linspace(0.01, 0.99, 99)]
check("Spend-to-learn proposition (i): s* >= Prop-1 spend at every belief", min(prem) > -0.02)

# ============================================================================
print("\nValue of information (Section 4.4 open question)")
# ============================================================================
# (a) Information about C has non-negative value: V_j convex in pi (two types).
ok = True
for t in range(200):
    cL, cH = sorted(rng.uniform(0, 1, 2))
    f2 = TwoType(cL, cH)
    J = int(rng.integers(1, 4))
    steps = [dict(v=float(rng.uniform(10, 200)), k=float(rng.uniform(5, 60)), c=float(rng.uniform(0, 20)),
                  phi=1.0 if j == 0 else float(rng.uniform(0.3, 1)), m=int(rng.integers(1, 4))) for j in range(J)]
    P = dict(sigma=1.0, lam=1.0, q=float(rng.uniform(0.2, 1)), qD=float(rng.uniform(0.2, 1)),
             hbar=float(rng.uniform(0.1, 1)), dD=float(rng.uniform(0.5, 0.99)), R=float(rng.uniform(0, 8000)),
             U=float(rng.uniform(0, 1500)), sting=(str(rng.choice(["D1", "D2", "KR"])), float(rng.uniform(0, 4))),
             steps=steps)
    d = Day(P, f2)
    xs = np.linspace(0, 1, 401)
    v = np.array([d.V(0, x) for x in xs])
    if np.min(v[:-2] - 2 * v[1:-1] + v[2:]) < -1e-7 * max(1, np.max(np.abs(v))):
        ok = False
check("VOI theorem (a): V_0 convex in beliefs about C under D1, D2, KR (random models)", ok)


# (b) Information about q: MLRP signals, general (grid) priors on q, C known, V_end = 0
QG = np.linspace(0.02, 0.98, 25)


def Vq(b, j, ws, phis, st, cue_m):
    """b: weights on QG.  Cue after each step: Bin(cue_m, q) signal (MLRP)."""
    J = len(ws)
    if j == J:
        return 0.0
    Eq = b @ QG
    p = phis[j] * Eq
    by = b * QG / Eq
    cont = 0.0
    if j + 1 < J:
        for z in range(cue_m + 1):
            lik = comb(cue_m, z) * QG**z * (1 - QG) ** (cue_m - z)
            pz = by @ lik
            cont += pz * Vq(by * lik / pz, j + 1, ws, phis, st, cue_m)
    X = ws[j] + cont
    if X <= 0:
        return 0.0
    return max(0.0, phat(p, st) * X)


worst = {}
for model in ["D1", "D2", "KR"]:
    w_min = 0.0
    for t in range(300):
        J = int(rng.integers(2, 4))
        ws = rng.uniform(-0.5, 1.0, J)
        phis = np.concatenate([[1.0], np.sort(rng.uniform(0.3, 1, J - 1))[::-1]])
        st = (model, float(rng.uniform(0, 3)))
        al, be = rng.uniform(0.5, 6, 2)
        b = QG ** (al - 1) * (1 - QG) ** (be - 1)
        b /= b.sum()
        u = int(rng.integers(1, 4))           # the cue: Bin(u, q)
        v0 = Vq(b, 0, ws, phis, st, 1)
        ev = 0.0
        for z in range(u + 1):
            lik = comb(u, z) * QG**z * (1 - QG) ** (u - z)
            pz = b @ lik
            ev += pz * Vq(b * lik / pz, 0, ws, phis, st, 1)
        w_min = min(w_min, ev - v0)
    worst[model] = w_min
print("  most negative EVSI of an MLRP cue found:", {k: f"{v:.2e}" for k, v in worst.items()})
check("VOI theorem (b): EVSI of MLRP signals about q is non-negative (random search)",
      all(v > -1e-10 for v in worst.values()))

# (c) Non-MLRP signal about q with negative value (three-point prior, D1, two steps)
Q3 = np.array([0.2, 0.6, 1.0])


def V3(b, eta, w1=0.0, w2=1.0):
    st = ("D1", eta)
    Eq = b @ Q3
    Eqy = (b @ Q3**2) / Eq
    X = w1 + max(0.0, phat(Eqy, st) * w2)
    return max(0.0, phat(Eq, st) * X)


b0 = np.array([0.3, 0.5, 0.2])
L1 = np.array([1.0, 0.0, 1.0])  # signal: "q is extreme" vs "q is middling"
p1 = b0 @ L1
b1, b2 = b0 * L1 / p1, b0 * (1 - L1) / (1 - p1)
for eta in [0.0, 0.5]:
    ev = p1 * V3(b1, eta) + (1 - p1) * V3(b2, eta) - V3(b0, eta)
    print(f"  eta={eta}: V(prior)={V3(b0, eta):.5f}, E V(posterior)={V3(b0, eta)+ev:.5f}, EVSI={ev:.5f}")
ev = p1 * V3(b1, 0.5) + (1 - p1) * V3(b2, 0.5) - V3(b0, 0.5)
check("Negative-EVSI example (D1): a non-MLRP signal about q has negative value under D1 (eta=0.5)", ev < -1e-4, f"EVSI={ev:.5f}")
for model in ["D2", "KR"]:
    def V3m(b, eta=0.5):
        st = (model, eta)
        Eq = b @ Q3
        Eqy = (b @ Q3**2) / Eq
        X = max(0.0, phat(Eqy, st) * 1.0)
        return max(0.0, phat(Eq, st) * X)
    ev_m = p1 * V3m(b1) + (1 - p1) * V3m(b2) - V3m(b0)
    print(f"  {model}, eta=0.5, same example: EVSI={ev_m:.5f} (positive: the D1 example does not carry over)")
# D2 / KR version: q in {0.1, 0.8, 1.0}, prior (1/4, 1/2, 1/4), same 'extreme vs middling' signal,
# eta = 2 under D2 (equivalently eta(Lambda-1) = 2 under KR), step values w1 = -1/2, w2 = 1.
Q3b = np.array([0.1, 0.8, 1.0])
b0b = np.array([0.25, 0.5, 0.25])
p1b = b0b @ L1
b1b, b2b = b0b * L1 / p1b, b0b * (1 - L1) / (1 - p1b)
for model, st in [("D2", ("D2", 2.0)), ("KR", ("KR", 2.0, 2.0))]:
    def V3b(b):
        f = lambda p: p - kappa(p, *st)
        Eq = b @ Q3b
        Eqy = (b @ Q3b**2) / Eq
        X = -0.5 + max(0.0, f(Eqy) * 1.0)
        return max(0.0, f(Eq) * X) if X > 0 else 0.0
    ev_b = p1b * V3b(b1b) + (1 - p1b) * V3b(b2b) - V3b(b0b)
    print(f"  {model}: V(prior)={V3b(b0b):.5f}, V(b1)={V3b(b1b):.5f}, V(b2)={V3b(b2b):.5f}, EVSI={ev_b:.5f}")
    check(f"Negative-EVSI example (D2/KR): a non-MLRP signal about q has negative value under {model}", ev_b < -1e-3)

print("\n" + ("ALL CHECKS PASSED" if not FAILS else f"{len(FAILS)} CHECK(S) FAILED: {FAILS}"))
