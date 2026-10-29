import type { Currency } from "./model";

const SYMBOL: Record<Currency, string> = { USD: "$", CAD: "CA$", EUR: "€", GBP: "£", UNKNOWN: "" };

export const money = (v: number | null | undefined, currency: Currency = "USD") =>
  v == null ? "Unknown" : `${SYMBOL[currency] ?? ""}${v.toFixed(2)}`;

export const miles = (v: number | null | undefined) => (v == null ? "Unknown" : `${round1(v)} mi`);

export const perMile = (v: number | null | undefined) => (v == null ? "—" : `$${v.toFixed(2)}/mi`);

export const perHour = (v: number | null | undefined) => (v == null ? "—" : `$${v.toFixed(2)}/hr`);

export const minutes = (v: number | null | undefined) => (v == null ? "Unknown" : `${Math.round(v)} min`);

export const round1 = (v: number) => Math.round(v * 10) / 10;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export const resultLabel = (r: string) =>
  r === "MATCH" ? "MATCH" : r === "NO_MATCH" ? "NO MATCH" : r === "REVIEW" ? "REVIEW" : "UNKNOWN";
