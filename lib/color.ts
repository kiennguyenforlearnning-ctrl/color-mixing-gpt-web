export type LabColor = { L: number; a: number; b: number };

export type ColorComparison = {
  target: LabColor;
  actual: LabColor;
  deltaL: number;
  deltaA: number;
  deltaB: number;
  deltaE00: number;
  tolerance: number | null;
  qc: "PASS" | "FAIL" | "UNKNOWN";
};

const degrees = (radians: number) => (radians * 180) / Math.PI;
const radians = (degreesValue: number) => (degreesValue * Math.PI) / 180;

function hueAngle(b: number, aPrime: number) {
  if (aPrime === 0 && b === 0) return 0;
  const angle = degrees(Math.atan2(b, aPrime));
  return angle >= 0 ? angle : angle + 360;
}

/** CIEDE2000, kL = kC = kH = 1. */
export function deltaE2000(lab1: LabColor, lab2: LabColor) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CBar = (C1 + C2) / 2;
  const CBar7 = Math.pow(CBar, 7);
  const G = 0.5 * (1 - Math.sqrt(CBar7 / (CBar7 + Math.pow(25, 7))));
  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;
  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
  const h1Prime = hueAngle(b1, a1Prime);
  const h2Prime = hueAngle(b2, a2Prime);
  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;
  let deltahPrime = 0;
  if (C1Prime * C2Prime !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) deltahPrime = diff;
    else if (diff > 180) deltahPrime = diff - 360;
    else deltahPrime = diff + 360;
  }
  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(radians(deltahPrime / 2));
  const LBarPrime = (L1 + L2) / 2;
  const CBarPrime = (C1Prime + C2Prime) / 2;
  let hBarPrime = h1Prime + h2Prime;
  if (C1Prime * C2Prime === 0) hBarPrime = h1Prime + h2Prime;
  else if (Math.abs(h1Prime - h2Prime) <= 180) hBarPrime = (h1Prime + h2Prime) / 2;
  else if (h1Prime + h2Prime < 360) hBarPrime = (h1Prime + h2Prime + 360) / 2;
  else hBarPrime = (h1Prime + h2Prime - 360) / 2;
  const T = 1 - 0.17 * Math.cos(radians(hBarPrime - 30)) + 0.24 * Math.cos(radians(2 * hBarPrime)) + 0.32 * Math.cos(radians(3 * hBarPrime + 6)) - 0.2 * Math.cos(radians(4 * hBarPrime - 63));
  const deltaTheta = 30 * Math.exp(-Math.pow((hBarPrime - 275) / 25, 2));
  const CBarPrime7 = Math.pow(CBarPrime, 7);
  const RC = 2 * Math.sqrt(CBarPrime7 / (CBarPrime7 + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(LBarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LBarPrime - 50, 2));
  const SC = 1 + 0.045 * CBarPrime;
  const SH = 1 + 0.015 * CBarPrime * T;
  const RT = -Math.sin(radians(2 * deltaTheta)) * RC;
  const lTerm = deltaLPrime / SL;
  const cTerm = deltaCPrime / SC;
  const hTerm = deltaHPrime / SH;
  return Math.sqrt(lTerm * lTerm + cTerm * cTerm + hTerm * hTerm + RT * cTerm * hTerm);
}

function finiteNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildDeterministicComparison(values: Record<string, string>): ColorComparison | null {
  const targetL = finiteNumber(values.targetL);
  const targetA = finiteNumber(values.targetA);
  const targetB = finiteNumber(values.targetB);
  const actualL = finiteNumber(values.actualL);
  const actualA = finiteNumber(values.actualA);
  const actualB = finiteNumber(values.actualB);
  if ([targetL, targetA, targetB, actualL, actualA, actualB].some((v) => v === null)) return null;
  const target = { L: targetL!, a: targetA!, b: targetB! };
  const actual = { L: actualL!, a: actualA!, b: actualB! };
  const tolerance = finiteNumber(values.tolerance);
  const deltaE00 = deltaE2000(target, actual);
  return {
    target,
    actual,
    deltaL: actual.L - target.L,
    deltaA: actual.a - target.a,
    deltaB: actual.b - target.b,
    deltaE00,
    tolerance,
    qc: tolerance === null ? "UNKNOWN" : deltaE00 <= tolerance ? "PASS" : "FAIL",
  };
}
