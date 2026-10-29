import type { Offer } from "./model";

export interface OfferStats {
  detected: number;
  matches: number;
  review: number;
  rejected: number;
  matchPct: number;
  avgFare: number | null;
  avgDistance: number | null;
  avgPerMile: number | null;
  matchEarnings: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function computeStats(offers: Offer[]): OfferStats {
  const matches = offers.filter((o) => o.matchResult === "MATCH");
  return {
    detected: offers.length,
    matches: matches.length,
    review: offers.filter((o) => o.matchResult === "REVIEW").length,
    rejected: offers.filter((o) => o.matchResult === "NO_MATCH").length,
    matchPct: offers.length ? Math.round((matches.length / offers.length) * 100) : 0,
    avgFare: avg(offers.flatMap((o) => (o.fare != null ? [o.fare] : []))),
    avgDistance: avg(offers.flatMap((o) => (o.totalDistance != null ? [o.totalDistance] : []))),
    avgPerMile: avg(offers.flatMap((o) => (o.dollarsPerMile != null ? [o.dollarsPerMile] : []))),
    matchEarnings: matches.reduce((s, o) => s + (o.fare ?? 0), 0),
  };
}

export const isSameDay = (iso: string, d: Date = new Date()) => {
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
};
