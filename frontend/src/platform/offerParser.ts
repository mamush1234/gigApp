// Generic, platform-agnostic text primitives. Platform adapters compose these.
// Rule: if a value is not clearly present, return UNKNOWN — never guess.
import type { Confidence, Currency, ParsedField } from "../domain/model";
import { field, unknownField } from "../domain/model";

const KM_TO_MI = 0.621371;

export function normalizeText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Split into logical segments on common UI separators. */
export function segments(text: string): string[] {
  return normalizeText(text)
    .split(/\n|•|·|\||—| - /)
    .map((s) => s.trim())
    .filter(Boolean);
}

const RATE_RE = /(?:US\$|CA\$|C\$|[$€£])\s?\d+(?:[.,]\d+)?\s?\/\s?(?:mi|mile|km|hr|hour|h)\b/gi;
const BONUS_RE = /\+\s?(?:US\$|CA\$|C\$|[$€£])\s?\d+(?:\.\d{1,2})?/g;
const MONEY_RE = /(US\$|CA\$|C\$|[$€£])\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

export function parseCurrency(text: string): ParsedField<Currency> {
  const t = text.replace(RATE_RE, "");
  const m = /(US\$|CA\$|C\$|[$€£])\s?\d/.exec(t);
  if (m) {
    const s = m[1];
    const c: Currency = s === "€" ? "EUR" : s === "£" ? "GBP" : s === "CA$" || s === "C$" ? "CAD" : "USD";
    return field(c, s === "$" ? "MEDIUM" : "HIGH");
  }
  const code = /\b(USD|EUR|GBP|CAD)\b/.exec(t);
  if (code) return field(code[1] as Currency, "HIGH");
  return unknownField();
}

/** "$28.50" → 28.5. Ignores rates ("$3.39/mile") and bonus amounts ("+$4.00"). */
export function parseFare(text: string): ParsedField<number> {
  const cleaned = normalizeText(text).replace(RATE_RE, " ").replace(BONUS_RE, " ");
  const values: { v: number; decimals: boolean }[] = [];
  for (const m of cleaned.matchAll(MONEY_RE)) {
    const n = Number(m[2].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) values.push({ v: n, decimals: m[2].includes(".") });
  }
  if (values.length === 0) {
    const coded = /(\d+(?:\.\d{1,2})?)\s?(?:USD|EUR|GBP|CAD)\b/.exec(cleaned);
    return coded ? field(Number(coded[1]), "MEDIUM") : unknownField();
  }
  const first = values[0];
  const distinct = new Set(values.map((x) => x.v)).size;
  let confidence: Confidence = first.decimals ? "HIGH" : "MEDIUM";
  if (distinct > 1) confidence = confidence === "HIGH" ? "MEDIUM" : "LOW";
  return field(first.v, confidence);
}

/** "$3.39/mile" → 3.39 (informational only; GigPilot computes its own $/mile). */
export function parseRatePerMile(text: string): ParsedField<number> {
  const m = /[$€£]\s?(\d+(?:\.\d+)?)\s?\/\s?(?:mi|mile)\b/i.exec(text);
  return m ? field(Number(m[1]), "HIGH") : unknownField();
}

export interface DistanceMatch {
  miles: number;
  unit: "mi" | "km";
  segment: string;
}

/** All distances: "8.4 mi", "8.4 miles", "12 km" (converted to miles). */
export function findDistances(text: string): DistanceMatch[] {
  const out: DistanceMatch[] = [];
  for (const seg of segments(text)) {
    const cleanSeg = seg.replace(RATE_RE, "");
    for (const m of cleanSeg.matchAll(/(\d+(?:\.\d+)?)\s?(mi|miles|mile|km|kilometers|kilometres)\b/gi)) {
      const n = Number(m[1]);
      const km = m[2].toLowerCase().startsWith("k");
      out.push({ miles: km ? Math.round(n * KM_TO_MI * 10) / 10 : n, unit: km ? "km" : "mi", segment: seg });
    }
  }
  return out;
}

export function parseDistance(text: string): ParsedField<number> {
  const d = findDistances(text);
  if (d.length === 0) return unknownField();
  return field(d[0].miles, d[0].unit === "km" ? "MEDIUM" : d.length === 1 ? "HIGH" : "MEDIUM");
}

export interface DurationMatch {
  minutes: number;
  segment: string;
}

/** "25 min", "1 hr 5 min", "18 mins" → minutes. */
export function findDurations(text: string): DurationMatch[] {
  const out: DurationMatch[] = [];
  for (const seg of segments(text)) {
    for (const m of seg.matchAll(/(?:(\d+)\s?(?:hr|hrs|hour|hours|h)\s?)?(\d+)\s?(?:min|mins|minutes)\b/gi)) {
      out.push({ minutes: (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]), segment: seg });
    }
    if (!/min/i.test(seg)) {
      const h = /(\d+)\s?(?:hr|hrs|hour|hours)\b/i.exec(seg);
      if (h) out.push({ minutes: Number(h[1]) * 60, segment: seg });
    }
  }
  return out;
}

export function parseDuration(text: string): ParsedField<number> {
  const d = findDurations(text);
  if (d.length === 0) return unknownField();
  return field(d[0].minutes, d.length === 1 ? "HIGH" : "MEDIUM");
}

const cleanLocation = (s: string) =>
  s
    .replace(MONEY_RE, "")
    .replace(/\(?\d+(?:\.\d+)?\s?(?:mi|miles|mile|km)\)?/gi, "")
    .replace(/\d+\s?(?:min|mins|minutes)\b/gi, "")
    .replace(/\b(away|trip|pickup|drop-?off)\b/gi, "")
    .replace(/[(),:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Route extraction: "Alexandria → Arlington", or labeled "Pickup: X" / "Dropoff: Y". */
export function parseRoute(text: string): { pickup: ParsedField<string>; destination: ParsedField<string> } {
  const t = normalizeText(text);
  const labeledPickup = /(?:pick\s?-?up|from)\s*[:]\s*([^\n•·|]+)/i.exec(t);
  const labeledDest = /(?:drop\s?-?off|destination|to)\s*[:]\s*([^\n•·|]+)/i.exec(t);
  let pickup: ParsedField<string> = unknownField();
  let destination: ParsedField<string> = unknownField();
  if (labeledPickup) {
    const v = cleanLocation(labeledPickup[1]);
    if (v) pickup = field(v, "HIGH");
  }
  if (labeledDest) {
    const v = cleanLocation(labeledDest[1]);
    if (v) destination = field(v, "HIGH");
  }
  if (pickup.value == null || destination.value == null) {
    for (const seg of segments(t)) {
      const m = /^(.+?)\s*(?:→|->|➜|⟶|➔|=>)\s*(.+)$/.exec(seg);
      if (m) {
        const a = cleanLocation(m[1]);
        const b = cleanLocation(m[2]);
        if (pickup.value == null && a) pickup = field(a, "MEDIUM");
        if (destination.value == null && b) destination = field(b, "MEDIUM");
        break;
      }
    }
  }
  return { pickup, destination };
}

/** Longest-first, case-insensitive ride type match from an adapter-provided list. */
export function parseRideType(text: string, knownTypes: string[]): ParsedField<string> {
  const sorted = [...knownTypes].sort((a, b) => b.length - a.length);
  for (const type of sorted) {
    const re = new RegExp(`(^|[^a-z])${type.replace(/\s+/g, "\\s?")}($|[^a-z])`, "i");
    if (re.test(text)) return field(type, "HIGH");
  }
  return unknownField();
}

export function parseSurge(text: string): ParsedField<string> {
  const mult = /(\d(?:\.\d{1,2})?)\s?x\b/i.exec(text);
  if (mult && /surge|x\b/i.test(text)) return field(`${mult[1]}x`, "HIGH");
  const bonus = /\+\s?([$€£]\s?\d+(?:\.\d{1,2})?)/.exec(text);
  if (bonus) return field(`+${bonus[1].replace(/\s/g, "")}`, "MEDIUM");
  if (/\bsurge\b/i.test(text)) return field("Surge", "LOW");
  return unknownField();
}

const PICKUP_WORDS = /\b(away|pickup|pick-up|pick up|to pickup)\b/i;
const TRIP_WORDS = /\b(trip|ride|total|dropoff|drop-off)\b/i;

/** Classify distances/durations by nearby keywords supplied by the adapter. */
export function classifyByContext<T extends { segment: string }>(
  matches: T[],
  pickupWords: RegExp = PICKUP_WORDS,
  tripWords: RegExp = TRIP_WORDS,
): { pickup: T | null; trip: T | null; tripConfidence: Confidence; pickupConfidence: Confidence } {
  const pickup = matches.find((m) => pickupWords.test(m.segment)) ?? null;
  const trip = matches.find((m) => tripWords.test(m.segment) && m !== pickup) ?? null;
  if (pickup || trip) {
    // A lone unlabeled value next to a labeled one is the other kind (MEDIUM).
    const rest = matches.filter((m) => m !== pickup && m !== trip);
    return {
      pickup: pickup ?? (trip && rest.length === 1 ? rest[0] : null),
      trip: trip ?? (pickup && rest.length === 1 ? rest[0] : null),
      pickupConfidence: pickup ? "HIGH" : trip && rest.length === 1 ? "MEDIUM" : "UNKNOWN",
      tripConfidence: trip ? "HIGH" : pickup && rest.length === 1 ? "MEDIUM" : "UNKNOWN",
    };
  }
  if (matches.length === 1) return { pickup: null, trip: matches[0], tripConfidence: "MEDIUM", pickupConfidence: "UNKNOWN" };
  if (matches.length === 2)
    return { pickup: matches[0], trip: matches[1], tripConfidence: "LOW", pickupConfidence: "LOW" };
  return { pickup: null, trip: null, tripConfidence: "UNKNOWN", pickupConfidence: "UNKNOWN" };
}
