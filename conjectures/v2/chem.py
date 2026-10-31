"""Two-class chemistry model (M3) with commitment (M4), one date, value after the date truncated (21)."""
import math

import numpy as np
from scipy.special import comb


def kappa(p, model, eta, Lam=2.0):
    if model == "D1":
        return eta * (1 - p)
    if model == "D2":
        return eta * p * (1 - p)
    if model == "KR":
        return eta * (Lam - 1) * p * (1 - p)
    raise ValueError(model)


NOSTING = ("D1", 0.0)


class Chem:
    """Classes z in {L, H} (index 0, 1).  Steps: index 0 is the opening (already taken), the agent
    decides at index j = 1..J-1 whether to ask for step j; n = steps completed (n = j at that point).
    commit: ('none',) | ('bond', psi) | ('slide', theta), psi/theta indexed by n = 0..J."""

    def __init__(self, C, q, qD, h, R, U, dD, steps, sting=NOSTING, stingC=NOSTING,
                 commit=("none",), hD=None, sigma=1.0, lam=1.0, plus=True):
        self.C, self.q, self.qD, self.h0 = C, q, qD, h
        self.hD = hD if hD is not None else h
        self.R, self.U, self.dD = R, U, dD
        self.steps, self.sting, self.stingC, self.commit = steps, sting, stingC, commit
        self.sigma, self.lam = sigma, lam
        self.plus = plus          # True: sting kappa*Delta^+ ; False: the proposal's literal kappa*Delta
        self.J = len(steps)

    def h(self, z, n):
        if self.commit[0] == "bond":
            return self.commit[1][n] * self.h0[z]
        if self.commit[0] == "slide":
            return self.h0[z] + self.commit[1][n]
        return self.h0[z]

    def Xask(self, z):
        """Phase-C value of asking for another date against class z (no sting)."""
        VD = self.dD * (self.hD[z] * self.C[z] * self.R + (1 - self.hD[z]) * self.U)
        return self.qD[z] * VD + (1 - self.qD[z]) * self.U

    def VC(self, pi):
        qDL, qDH = self.qD
        PD = pi * qDH + (1 - pi) * qDL
        piy = pi * qDH / PD
        VD = self.dD * sum(w * (self.hD[z] * self.C[z] * self.R + (1 - self.hD[z]) * self.U)
                           for z, w in ((1, piy), (0, 1 - piy)))
        ask = PD * VD + (1 - PD) * self.U - kappa(PD, *self.stingC) * max(VD - self.U, 0.0)
        return max(self.U, ask), ask >= self.U

    def Vend(self, pi, n):
        hL, hH = self.h(0, n), self.h(1, n)
        Eh = pi * hH + (1 - pi) * hL
        pinot = pi * (1 - hH) / (1 - Eh)
        return (pi * hH * self.C[1] + (1 - pi) * hL * self.C[0]) * self.R + (1 - Eh) * self.VC(pinot)[0]

    def plan(self, pi, n):
        hL, hH = self.h(0, n), self.h(1, n)
        Eh = pi * hH + (1 - pi) * hL
        return self.VC(pi * (1 - hH) / (1 - Eh))[1]

    def W(self, pi, st):
        x = (pi * self.C[1] + (1 - pi) * self.C[0]) * st["v"]
        sl = self.sigma * self.lam * st["k"]
        return x * math.log(x / sl) if x >= sl else x - sl

    def rating(self, pi, m):
        out = []
        for y in range(m + 1):
            lH = comb(m, y) * self.C[1] ** y * (1 - self.C[1]) ** (m - y)
            lL = comb(m, y) * self.C[0] ** y * (1 - self.C[0]) ** (m - y)
            pr = pi * lH + (1 - pi) * lL
            if pr > 0:
                out.append((pr, pi * lH / pr))
        return out

    def V(self, j, pi):
        if j == self.J:
            return self.Vend(pi, self.J)
        return self.Vend(pi, j) + max(0.0, self.D(j, pi))

    def parts(self, j, pi):
        st = self.steps[j]
        qL, qH = self.q
        qbar = pi * qH + (1 - pi) * qL
        p = st["phi"] * qbar
        piy = pi * qH / qbar
        pin = pi * (1 - st["phi"] * qH) / (1 - p)
        X = self.W(piy, st) - st["c"] + sum(pr * self.V(j + 1, post) for pr, post in self.rating(piy, st["m"]))
        return p, X, self.Vend(pin, j), self.Vend(pi, j)

    def D(self, j, pi):
        """Value of asking for step j minus value of ending (Delta^+ convention)."""
        p, X, Vno, Vnow = self.parts(j, pi)
        stake = max(X - Vno, 0.0) if self.plus else X - Vno
        return p * X + (1 - p) * Vno - kappa(p, *self.sting) * stake - Vnow

    def K(self, pi, n):
        return self.Vend(pi, n + 1) - self.Vend(pi, n)


class ChemMulti(Chem):
    """M2+ on the chemistry prior: full date-by-date recursion (no talking option), solved by value
    iteration on a grid of pi with linear interpolation.  A date starts with its opening step
    (agreed in Phase C or Phase A), then asks for steps 1..J-1; then relationship or Phase C."""

    def __init__(self, *a, grid=801, tol=1e-10, **k):
        super().__init__(*a, **k)
        self.g = np.linspace(0.0, 1.0, grid)
        self.Vdate = np.full(grid, self.U)
        for it in range(5000):
            new = np.array([self.date_value(x) for x in self.g])
            if np.max(np.abs(new - self.Vdate)) < tol:
                self.Vdate = new
                break
            self.Vdate = new
        self.iters = it

    def Vd(self, pi):
        return float(np.interp(pi, self.g, self.Vdate))

    def VC(self, pi):
        qDL, qDH = self.qD
        PD = pi * qDH + (1 - pi) * qDL
        piy = pi * qDH / PD
        VD = self.dD * self.Vd(piy)
        ask = PD * VD + (1 - PD) * self.U - kappa(PD, *self.stingC) * max(VD - self.U, 0.0)
        return max(self.U, ask), ask >= self.U

    def date_value(self, pi):
        st = self.steps[0]
        return self.W(pi, st) - st["c"] + sum(pr * self.V(1, post) for pr, post in self.rating(pi, st["m"]))
