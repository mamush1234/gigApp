import type { Platform } from "./model";

export interface DemoOffer {
  id: string;
  title: string;
  platform: Platform;
  rawText: string; // simulated notification / screen text, run through the real adapter + parser
  expected: string; // with default preferences
}

export const DEMO_OFFERS: DemoOffer[] = [
  { id: "d1", title: "Short airport-free hop", platform: "UBER", expected: "MATCH",
    rawText: "UberX • $32.00 • 4 min (1.1 mi) away • 18 min (8.0 mi) trip • Alexandria → Arlington" },
  { id: "d2", title: "Low fare, long ride", platform: "UBER", expected: "NO MATCH",
    rawText: "New ride request — $18.00 — 12.0 mi" },
  { id: "d3", title: "Lyft XL to Reston", platform: "LYFT", expected: "Depends on preferences",
    rawText: "Lyft XL · $40.00 · 6 min (2.0 mi) away · 32 min (15.0 mi) trip · Fairfax → Reston" },
  { id: "d4", title: "Classic example", platform: "UBER", expected: "MATCH",
    rawText: "Uber Comfort • $28.50 • 8.4 mi • 27 min • Alexandria → Arlington" },
  { id: "d5", title: "Cheap & far", platform: "UBER", expected: "NO MATCH",
    rawText: "$16.00 • 14 mi" },
  { id: "d6", title: "Into excluded area", platform: "UBER", expected: "NO MATCH",
    rawText: "Uber Black • $54.20 • 5 min (1.8 mi) away • 35 min (19.6 mi) trip • Springfield → Washington DC" },
  { id: "d7", title: "Under minimum fare", platform: "LYFT", expected: "NO MATCH",
    rawText: "Lyft · $22.75 · 3 min (0.9 mi) away · 15 min (6.1 mi) trip · Arlington → Alexandria" },
  { id: "d8", title: "Partial info (no distance)", platform: "LYFT", expected: "REVIEW",
    rawText: "Lyft · $31.40 · Pickup: Arlington" },
  { id: "d9", title: "Malformed notification", platform: "UBER", expected: "UNKNOWN",
    rawText: "New ride request — tap to view" },
  { id: "d10", title: "Surge from Fairfax", platform: "UBER", expected: "MATCH",
    rawText: "UberX • $45.10 • Surge 1.8x • 7 min (3.2 mi) away • 28 min (13.5 mi) trip • Fairfax → Alexandria" },
  { id: "d11", title: "Long pickup", platform: "LYFT", expected: "NO MATCH",
    rawText: "Lyft · $38.00 · 14 min (7.5 mi) away · 25 min (11.0 mi) trip · Springfield → Arlington" },
  { id: "d12", title: "Foreign currency", platform: "UBER", expected: "REVIEW",
    rawText: "UberX • €26.00 • 12 km • 20 min • Arlington → Alexandria" },
  { id: "d13", title: "Too short trip", platform: "LYFT", expected: "NO MATCH",
    rawText: "Lyft · $9.00 · 1.2 mi · 6 min" },
];
