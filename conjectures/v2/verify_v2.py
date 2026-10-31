"""Numerical checks for proofs_v2.tex (the conjectures of the revised proposal: chemistry prior M3,
commitment M4, several dates M2+).  Run:  python3 verify_v2.py   (numpy, scipy; a few minutes).
Model code is in chem.py.  Labels name results, not numbers."""
import numpy as np
from scipy.optimize import brentq

from chem import Chem, ChemMulti, kappa

rng = np.random.default_rng(20261030)
FAILS = []
OP = dict(v=10.0, k=8.0, c=0.0, phi=1.0, m=1)        # opening step (already taken when deciding)


def check(name, cond, detail=""):
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"   [{detail}]" if detail else ""))
    if not cond:
        FAILS.append(name)


def roots(f, lo=0.001, hi=0.999, n=999):
    xs = np.linspace(lo, hi, n)
    v = np.array([f(x) for x in xs])
    out = []
    for i in range(1, n):
        if np.sign(v[i]) != np.sign(v[i - 1]) and v[i] != 0 and v[i - 1] != 0:
            out.append(brentq(f, xs[i - 1], xs[i]))
    return out


def hchem(hb, C, qD):
    return (hb * C[0] * qD[0], hb * C[1] * qD[1])


# ============================================================================
print("\nConjecture 1 (threshold rules) on the chemistry prior")
# ============================================================================
# (A) the after-date decision is pivotal; no sting anywhere
C, q, qD = (0.2, 0.8), (0.895, 0.9), (0.795, 0.8)
mA = Chem(C=C, q=q, qD=qD, h=hchem(0.5, C, qD), R=6000.0, U=1000.0, dD=0.9,
          steps=[OP, dict(v=50.0, k=30.0, c=0.0, phi=1.0, m=1)])
rA = roots(lambda x: mA.D(1, x))
print("  (A) switch points of the ask set:", [f"{r:.4f}" for r in rA])
check("C1 counterexample (A): ask set is not an interval, with no sting", len(rA) == 3)

# (B) fear of bad news: Phase-C plan constant, sting in the date only
C, q, qD = (0.5, 0.6), (0.5, 0.95), (0.5, 0.9)
hB = (C[0] * qD[0], C[1] * qD[1])


def mB(R, sting):
    return Chem(C=C, q=q, qD=qD, h=hB, R=R, U=100.0, dD=0.9,
                steps=[OP, dict(v=40.0, k=10.0, c=0.0, phi=1.0, m=1)], sting=sting)


for R in (1000.0, 3000.0):
    m = mB(R, ("D1", 0.5))
    r = roots(lambda x: m.D(1, x))
    const = len({m.plan(x, 1) for x in np.linspace(0, 1, 201)}) == 1
    print(f"  (B) D1 eta=0.5, R={R:.0f}: ask on [0,{r[0]:.4f}] U [{r[1]:.4f},1];  Phase-C plan constant: {const}")
    check(f"C1 counterexample (B), R={R:.0f}: ask near 0 and near 1, end at 1/2",
          len(r) == 2 and m.D(1, 0.01) > 0 and m.D(1, 0.5) < 0 and m.D(1, 0.99) > 0 and const)
    m0 = mB(R, ("D1", 0.0))
    check(f"  same model without sting asks everywhere (R={R:.0f})",
          min(m0.D(1, x) for x in np.linspace(0.001, 0.999, 300)) > 0)
for st in (("D2", 0.8), ("KR", 0.8, 2.0)):
    m = mB(3000.0, st)
    r = roots(lambda x: m.D(1, x))
    check(f"C1 counterexample (B) also under {st[0]}", len(r) == 2 and m.D(1, 0.5) < 0, f"{[round(x, 4) for x in r]}")

# last-step characterisation: ask iff p_hat>0 and A >= rho
m = mB(1000.0, ("D1", 0.5))
ok = True
for x in np.linspace(0.01, 0.99, 99):
    p, X, Vno, Vnow = m.parts(1, x)
    qb = x * q[1] + (1 - x) * q[0]
    piy, pin = x * q[1] / qb, x * (1 - q[1]) / (1 - qb)
    a1 = m.Vend(1.0, 1) - m.Vend(0.0, 1)
    A = X - m.Vend(piy, 1)
    Gam = a1 * (piy - pin)
    k_ = kappa(p, "D1", 0.5)
    rho = k_ * Gam / (p - k_)
    ok &= (m.D(1, x) >= 0) == (A >= rho)
    ok &= abs(Gam - a1 * x * (1 - x) * (q[1] - q[0]) / (qb * (1 - qb))) < 1e-9
check("Last-step characterisation: ask iff A >= kappa*Gamma/p_hat, Gamma formula", ok)

# Positive theorem: no sting, constant Phase-C plan => threshold at every step
ok, n = True, 0
for t in range(150):
    CL, CH = sorted(rng.uniform(0.05, 1, 2)); qL, qH = sorted(rng.uniform(0.1, 1, 2))
    qDL, qDH = sorted(rng.uniform(0.1, 1, 2)); hb = rng.uniform(0.1, 1)
    J = int(rng.integers(2, 4))
    steps = [OP] + [dict(v=float(rng.uniform(10, 150)), k=float(rng.uniform(5, 60)), c=float(rng.uniform(0, 15)),
                         phi=float(rng.uniform(0.4, 1)), m=int(rng.integers(1, 3))) for _ in range(J - 1)]
    m = Chem(C=(CL, CH), q=(qL, qH), qD=(qDL, qDH), h=hchem(hb, (CL, CH), (qDL, qDH)),
             R=float(rng.uniform(0, 3000)), U=float(rng.uniform(0, 500)), dD=0.0, steps=steps)   # dD=0: always cut
    n += 1
    for j in range(1, J):
        d = np.array([m.D(j, x) for x in np.linspace(0.002, 0.998, 200)])
        s = np.sign(d[np.abs(d) > 1e-9])
        ok &= int(np.sum(s[1:] != s[:-1])) <= 1 and (len(s) == 0 or s[-1] >= s[0])
check(f"Threshold theorem (no sting, constant Phase-C plan): single crossing at every step ({n} models)", ok)

# ============================================================================
print("\nConjecture 2 (relationship value with commitment)")
# ============================================================================
# (a) at pi=1 the value of escalating is nondecreasing in R, any stings, bonding or sliding
ok, n = True, 0
for t in range(150):
    CL, CH = sorted(rng.uniform(0.05, 1, 2)); qL, qH = sorted(rng.uniform(0.1, 1, 2))
    qDL, qDH = sorted(rng.uniform(0.1, 1, 2)); hb = rng.uniform(0.1, 0.8)
    J = int(rng.integers(2, 4))
    steps = [OP] + [dict(v=float(rng.uniform(10, 150)), k=float(rng.uniform(5, 60)), c=float(rng.uniform(0, 15)),
                         phi=float(rng.uniform(0.4, 1)), m=int(rng.integers(1, 3))) for _ in range(J - 1)]
    if rng.uniform() < 0.5:
        com = ("bond", list(np.concatenate([[1.0, 1.0], np.cumprod(rng.uniform(1, 1.3, J - 1))])))
    else:
        com = ("slide", list(np.concatenate([[0.0, 0.0], np.cumsum(rng.uniform(0, 0.05, J - 1))])))
    st = (str(rng.choice(["D1", "D2", "KR"])), float(rng.uniform(0, 2)))
    stC = (str(rng.choice(["D1", "D2", "KR"])), float(rng.uniform(0, 2)))
    h = hchem(hb, (CL, CH), (qDL, qDH))
    vals = []
    for R in np.linspace(0, 5000, 41):
        m = Chem(C=(CL, CH), q=(qL, qH), qD=(qDL, qDH), h=h, R=float(R), U=float(rng.uniform(0, 1)) * 0 + 200.0,
                 dD=0.9, steps=steps, sting=st, stingC=stC, commit=com)
        row = []
        for j in range(1, J):
            p, X, Vno, Vnow = m.parts(j, 1.0)
            ph = p - kappa(p, *st)
            row.append((X - Vnow, m.D(j, 1.0) if ph > 0 else 0.0))   # gain from a yes; D when the agent can ask
        vals.append(row)
    vals = np.array(vals)
    ok &= bool(np.all(np.diff(vals, axis=0) >= -1e-7))
    n += 1
check(f"Conj 2(a) at pi=1: G_j nondecreasing in R, and D_j too whenever p_hat>0 ({n} random M4 models)", ok)

# asymptotic slope Phi and the weak-bonding counterexample
C, q, qD = (0.3, 0.8), (0.5, 0.9), (0.5, 0.9)
h4, dD = hchem(0.5, C, qD), 0.9
st4 = dict(v=40.0, k=15.0, c=0.0, phi=1.0, m=1)


def m4(R, psi):
    return Chem(C=C, q=q, qD=qD, h=h4, R=R, U=100.0, dD=dD, steps=[OP, st4], sting=("D1", 0.5),
                commit=("bond", [1.0, 1.0, psi]))


def Phi(pi, psi):
    m = m4(1.0, psi)
    qb = pi * q[1] + (1 - pi) * q[0]
    p, piy, pin = qb, pi * q[1] / qb, pi * (1 - q[1]) / (1 - qb)
    cb = lambda z, n: m.h(z, n) * C[z] + (1 - m.h(z, n)) * qD[z] * dD * h4[z] * C[z]
    Kb = piy * (cb(1, 2) - cb(1, 1)) + (1 - piy) * (cb(0, 2) - cb(0, 1))
    k_ = kappa(p, "D1", 0.5)
    return (p - k_) * Kb - k_ * (piy - pin) * (cb(1, 1) - cb(0, 1))


ok = True
for psi in (1.05, 1.5):
    for pi in (1.0, 0.97, 0.9):
        slope = m4(20001.0, psi).D(1, pi) - m4(20000.0, psi).D(1, pi)
        ok &= abs(slope - Phi(pi, psi)) < 1e-6
check("Asymptotic slope dD/dR = Phi(pi) for large R", ok)
Ds = [m4(R, 1.05).D(1, 0.9) for R in (1000.0, 5000.0, 20000.0, 40000.0)]
D1s = [m4(R, 1.05).D(1, 1.0) for R in (1000.0, 5000.0, 20000.0, 40000.0)]
print("  weak bonding psi=1.05:  D(pi=0.9) at R=1e3,5e3,2e4,4e4:", [round(x, 2) for x in Ds],
      "  D(pi=1):", [round(x, 2) for x in D1s])
check("Conj 2(a) counterexample: at pi=0.9 higher R lowers the value of escalating and ends asking",
      Ds[0] > Ds[1] > Ds[2] > 0 > Ds[3] and D1s[0] < D1s[1] < D1s[2] < D1s[3])

# (b) sliding: range of beliefs with negative commitment value
C, qD = (0.28, 0.93), (0.71, 0.99)


def m5(R):
    return Chem(C=C, q=(0.5, 0.6), qD=qD, h=hchem(0.85, C, qD), R=R, U=100.0, dD=0.95,
                steps=[OP, OP], commit=("slide", [0.0, 0.0, 0.06]))


k1, k2 = m5(230.0).K(0.27, 1), m5(250.0).K(0.27, 1)
print(f"  sliding: K(0.27; R=230) = {k1:.4f} (plans n=1,2: {m5(230.0).plan(0.27, 1)}, {m5(230.0).plan(0.27, 2)});"
      f"  K(0.27; R=250) = {k2:.4f} (plans {m5(250.0).plan(0.27, 1)}, {m5(250.0).plan(0.27, 2)})")
check("Conj 2(b) counterexample: pi=0.27 has K>=0 at R=230 but K<0 at R=250", k1 >= 0 > k2)
check("  the counterexample needs a plan switch between n and n+1 at the lower R",
      m5(230.0).plan(0.27, 1) != m5(230.0).plan(0.27, 2))
# a stronger counterexample: the negative set grows in measure and in its upper end
C2, qD2 = (0.1397, 0.8664), (0.9160, 0.9619)
m5b = lambda R: Chem(C=C2, q=(0.5, 0.6), qD=qD2, h=hchem(0.9541, C2, qD2), R=R, U=100.0, dD=0.9617,
                     steps=[OP, OP], commit=("slide", [0.0, 0.0, 0.1159]))
xs_ = np.linspace(0.0005, 0.9995, 2000)
meas = []
for R in (147.44, 169.39):
    kk = np.array([m5b(R).K(x, 1) for x in xs_])
    meas.append((float(np.mean(kk < 0)), float(xs_[kk < 0].max())))
kA, kB = m5b(147.44).K(0.77, 1), m5b(169.39).K(0.77, 1)
print(f"  stronger example: measure of N {meas[0][0]:.3f} -> {meas[1][0]:.3f}, sup N {meas[0][1]:.3f} -> {meas[1][1]:.3f};"
      f" K(0.77) {kA:.4f} -> {kB:.4f}")
check("Conj 2(b) stronger counterexample: N grows in measure and upper end", meas[1][0] > meas[0][0] + 0.03
      and meas[1][1] > meas[0][1] + 0.03 and kA > 0 > kB)
# true part: same plan at n and n+1 (at both R) => K nondecreasing in R; and at pi=0, pi=1
ok, cnt = True, 0
for t in range(300):
    CL, CH = sorted(rng.uniform(0, 1, 2)); qDL, qDH = sorted(rng.uniform(0.05, 1, 2)); hb = rng.uniform(0.1, 1)
    th = rng.uniform(0.005, 0.3); dDr = rng.uniform(0.3, 0.99)
    mk = lambda R: Chem(C=(CL, CH), q=(0.5, 0.6), qD=(qDL, qDH), h=hchem(hb, (CL, CH), (qDL, qDH)), R=R, U=100.0,
                        dD=dDr, steps=[OP, OP], commit=("slide", [0.0, 0.0, th]))
    for x in [0.0, 1.0] + list(rng.uniform(0, 1, 6)):
        Rs = np.exp(np.linspace(np.log(5), np.log(20000), 50))
        ms = [mk(R) for R in Rs]
        Ks = np.array([mm.K(x, 1) for mm in ms])
        same = np.array([mm.plan(x, 1) == mm.plan(x, 2) for mm in ms])
        for i in range(len(Rs) - 1):
            if (same[i] and same[i + 1] and ms[i].plan(x, 1) == ms[i + 1].plan(x, 1)) or x in (0.0, 1.0):
                cnt += 1
                ok &= Ks[i + 1] >= Ks[i] - 1e-7 * max(1, abs(Ks[i]))
check(f"Conj 2(b) true part: K nondecreasing in R when the plan does not switch, and at pi=0,1 ({cnt} pairs)", ok)

# ============================================================================
print("\nConjecture 3 (outside option) in M2+ on the chemistry prior (full recursion)")
# ============================================================================
C, q, qD = (0.24, 0.63), (0.74, 0.76), (0.42, 0.59)
kw = dict(C=C, q=q, qD=qD, h=hchem(0.36, C, qD), R=1470.0, dD=0.88,
          steps=[OP, dict(v=96.0, k=50.0, c=0.0, phi=1.0, m=2)])
res = {}
for U in (313.0, 322.0):
    for grid in (401, 1601):
        m = ChemMulti(U=U, grid=grid, **kw)
        r = roots(lambda x: m.D(1, x), n=499)
        xs = np.linspace(0, 1, 2001)
        askC = xs[int(np.argmax([m.VC(x)[1] for x in xs]))]
        res[(U, grid)] = (r, [m.plan(x, 1) for x in r], askC)
        print(f"  U={U:.0f} grid={grid}: on-day switch points {[round(x, 4) for x in r]}, "
              f"Phase C would ask there: {res[(U, grid)][1]}, Phase C asks for pi >= {askC:.4f}")
r0, r1 = res[(313.0, 1601)][0], res[(322.0, 1601)][0]
check("Conj 3 counterexample in M2+: higher U lowers the on-day threshold (single crossing at both U)",
      len(r0) == 1 and len(r1) == 1 and r1[0] < r0[0] - 0.01 and all(res[(313.0, 1601)][1]))
check("  robust to the grid", abs(res[(313.0, 401)][0][0] - r0[0]) < 1e-3 and abs(res[(322.0, 401)][0][0] - r1[0]) < 1e-3)
check("Conj 3 true part: Phase-C asking region shrinks as U rises", res[(322.0, 1601)][2] > res[(313.0, 1601)][2])
ok = True
for t in range(6):
    CL, CH = sorted(rng.uniform(0.05, 1, 2)); qL, qH = sorted(rng.uniform(0.3, 1, 2)); qDL, qDH = sorted(rng.uniform(0.2, 1, 2))
    kwr = dict(C=(CL, CH), q=(qL, qH), qD=(qDL, qDH), h=hchem(rng.uniform(0.2, 1), (CL, CH), (qDL, qDH)),
               R=float(rng.uniform(100, 3000)), dD=float(rng.uniform(0.6, 0.95)), grid=201,
               steps=[OP, dict(v=float(rng.uniform(20, 120)), k=float(rng.uniform(5, 50)), c=0.0, phi=1.0, m=1)])
    U0 = float(rng.uniform(50, 400))
    a, b = ChemMulti(U=U0, **kwr), ChemMulti(U=U0 * 1.05, **kwr)
    for x in np.linspace(0, 1, 41):
        qb = x * qDH + (1 - x) * qDL
        piy = x * qDH / qb
        ok &= (b.dD * b.Vd(piy) - b.U) < (a.dD * a.Vd(piy) - a.U) + 1e-9
check("Conj 3 true part (random M2+ models, no sting): delta_D V_date - U strictly decreasing in U", ok)

# ============================================================================
print("\nValue of information and other findings on the chemistry prior")
# ============================================================================
mV = Chem(C=(0.11, 0.6), q=(0.81, 0.88), qD=(0.5, 0.9), h=hchem(0.5, (0.11, 0.6), (0.5, 0.9)), R=129.0, U=100.0,
          dD=0.0, steps=[OP, dict(v=31.0, k=10.0, c=0.0, phi=1.0, m=1)], sting=("D1", 1.5))
mVlit = Chem(C=(0.11, 0.6), q=(0.81, 0.88), qD=(0.5, 0.9), h=hchem(0.5, (0.11, 0.6), (0.5, 0.9)), R=129.0, U=100.0,
             dD=0.0, steps=[OP, dict(v=31.0, k=10.0, c=0.0, phi=1.0, m=1)], sting=("D1", 1.5), plus=False)
pi, a = 0.44, 0.52
ps = pi * a + (1 - pi) * (1 - a)
p1, p0 = pi * a / ps, pi * (1 - a) / (1 - ps)
ev = ps * mV.V(1, p1) + (1 - ps) * mV.V(1, p0) - mV.V(1, pi)
evl = ps * mVlit.V(1, p1) + (1 - ps) * mVlit.V(1, p0) - mVlit.V(1, pi)
a1 = mV.Vend(1.0, 1) - mV.Vend(0.0, 1)
stakes = [mV.parts(1, x)[1] - mV.parts(1, x)[2] for x in (p0, pi, p1)]
print(f"  Delta^+ artefact: a_1={a1:.3f} (refusals are good news), stakes at p0, pi, p1: {[round(s_, 3) for s_ in stakes]};"
      f" EVSI with Delta^+ = {ev:.5f}, with the literal kappa*Delta = {evl:.5f}")
check("Negative EVSI arises only from the Delta^+ kink when refusals are good news (a_1<0)",
      ev < -0.01 and evl > 0 and a1 < 0 and stakes[1] < 0 < stakes[2])

# Convexity proposition: last step, constant Phase-C plan (cut), a_1>=0, p_hat(phi q_L)>=0,
# Delta>=0 on [0,1] (D1) or A>=0 on [0,1] (D2, KR)  =>  V convex in pi
ok, n = True, 0
xs = np.linspace(0.0, 1.0, 401)
for t in range(3000):
    CL, CH = sorted(rng.uniform(0.05, 1, 2)); qL, qH = sorted(rng.uniform(0.2, 1, 2)); qDL, qDH = sorted(rng.uniform(0.1, 1, 2))
    model = str(rng.choice(["D1", "D2", "KR"])); eta = float(rng.uniform(0, 2))
    st = (model, eta) if model != "KR" else (model, eta, 2.0)
    stp = dict(v=float(rng.uniform(10, 150)), k=float(rng.uniform(5, 60)), c=float(rng.uniform(0, 10)),
               phi=float(rng.uniform(0.5, 1)), m=int(rng.integers(1, 3)))
    m = Chem(C=(CL, CH), q=(qL, qH), qD=(qDL, qDH), h=hchem(rng.uniform(0.1, 1), (CL, CH), (qDL, qDH)),
             R=float(rng.uniform(0, 3000)), U=float(rng.uniform(0, 500)), dD=0.0, steps=[OP, stp], sting=st)
    if m.Vend(1.0, 1) < m.Vend(0.0, 1):
        continue
    p_lo = stp["phi"] * qL
    if p_lo - kappa(p_lo, *st) < 0:
        continue
    parts = [m.parts(1, x) for x in xs]
    A = np.array([X - m.Vend(x * qH / (x * qH + (1 - x) * qL), 1) for x, (p, X, Vno, Vnow) in zip(xs, parts)])
    Dl = np.array([X - Vno for (p, X, Vno, Vnow) in parts])
    if (model == "D1" and Dl.min() < 0) or (model != "D1" and A.min() < 0):
        continue
    n += 1
    v = np.array([m.V(1, x) for x in xs])
    ok &= bool(np.min(v[:-2] - 2 * v[1:-1] + v[2:]) > -1e-8 * max(1.0, np.max(np.abs(v))))
check(f"Convexity proposition: V convex in pi at the last step under its conditions ({n} models)", ok and n > 100)

# Proposition 6 holds in M3 (h^D = h, strict ordering): V_end nondecreasing whenever each plan pays
# at least as much against the high class
ok, n = True, 0
for t in range(20000):
    CL, CH = sorted(rng.uniform(0.0, 1, 2)); qDL, qDH = sorted(rng.uniform(0.01, 1, 2))
    m = Chem(C=(CL, CH), q=(0.5, 0.6), qD=(qDL, qDH), h=hchem(rng.uniform(0.05, 1), (CL, CH), (qDL, qDH)),
             R=float(rng.uniform(0, 3000)), U=float(rng.uniform(0, 500)), dD=float(rng.choice([0.0, rng.uniform(0.3, 0.99)])),
             steps=[OP, OP])
    if m.Xask(1) < m.Xask(0):
        continue
    n += 1
    ve = [m.Vend(x, 1) for x in np.linspace(0, 1, 41)]
    ok &= bool(np.all(np.diff(ve) >= -1e-9))
check(f"Proposition 6 holds in M3: V_end nondecreasing under its hypothesis ({n} models)", ok and n > 1000)

print("\n" + ("ALL CHECKS PASSED" if not FAILS else f"{len(FAILS)} CHECK(S) FAILED: {FAILS}"))
