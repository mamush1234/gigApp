import type { Offer, ParsedOffer, Preferences } from "../model";
import { evaluateOffer, toEvaluable } from "../rules/ruleEngine";

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** ParsedOffer + Preferences → evaluated Offer. Same path for live, demo and manual offers. */
export function createOffer(parsed: ParsedOffer, prefs: Preferences, now: Date = new Date()): Offer {
  const evaluation = evaluateOffer(toEvaluable(parsed), prefs);
  evaluation.warnings = [...new Set([...parsed.warnings.filter((w) => !w.startsWith("No destination")), ...evaluation.warnings])];
  return {
    id: newId(),
    platform: parsed.platform,
    source: parsed.source,
    timestamp: now.toISOString(),
    fare: parsed.fare.value,
    currency: parsed.currency.value ?? "UNKNOWN",
    pickupDistance: parsed.pickupDistance.value,
    totalDistance: parsed.totalDistance.value,
    estimatedDuration: parsed.estimatedDuration.value,
    pickupLocation: parsed.pickupLocation.value,
    destination: parsed.destination.value,
    rideType: parsed.rideType.value,
    surge: parsed.surge.value,
    rawText: parsed.rawText,
    matchResult: evaluation.result,
    matchScore: evaluation.score,
    rejectionReasons: evaluation.failedRules.map((r) => r.detail),
    dollarsPerMile: evaluation.dollarsPerMile,
    confidence: {
      fare: parsed.fare.confidence,
      currency: parsed.currency.confidence,
      pickupDistance: parsed.pickupDistance.confidence,
      totalDistance: parsed.totalDistance.confidence,
      estimatedDuration: parsed.estimatedDuration.confidence,
      pickupLocation: parsed.pickupLocation.confidence,
      destination: parsed.destination.confidence,
      rideType: parsed.rideType.confidence,
      surge: parsed.surge.confidence,
    },
    evaluation,
  };
}

export interface ManualOfferInput {
  platform: ParsedOffer["platform"];
  fare: number | null;
  pickupDistance: number | null;
  totalDistance: number | null;
  pickupLocation: string | null;
  destination: string | null;
  rideType: string | null;
  duration: number | null;
}

/** Manual entry: user-typed values are HIGH confidence; blanks stay UNKNOWN. */
export function manualToParsed(i: ManualOfferInput): ParsedOffer {
  const f = <T>(v: T | null) => ({ value: v, confidence: v == null ? ("UNKNOWN" as const) : ("HIGH" as const) });
  const parts = [
    i.rideType,
    i.fare != null ? `$${i.fare.toFixed(2)}` : null,
    i.pickupDistance != null ? `${i.pickupDistance} mi away` : null,
    i.totalDistance != null ? `${i.totalDistance} mi trip` : null,
    i.duration != null ? `${i.duration} min` : null,
    i.pickupLocation || i.destination ? `${i.pickupLocation ?? "?"} → ${i.destination ?? "?"}` : null,
  ].filter(Boolean);
  return {
    platform: i.platform,
    source: "MANUAL",
    fare: f(i.fare),
    currency: { value: i.fare != null ? "USD" : null, confidence: i.fare != null ? "HIGH" : "UNKNOWN" },
    pickupDistance: f(i.pickupDistance),
    totalDistance: f(i.totalDistance),
    estimatedDuration: f(i.duration),
    pickupLocation: f(i.pickupLocation),
    destination: f(i.destination),
    rideType: f(i.rideType),
    surge: f<string>(null),
    rawText: `Manual entry: ${parts.join(" • ")}`,
    warnings: [],
  };
}
