import type { OfferSource, ParsedField, ParsedOffer, Platform } from "../domain/model";
import { parseCurrency, parseSurge, normalizeText } from "./offerParser";

export interface DistanceExtraction {
  pickup: ParsedField<number>;
  total: ParsedField<number>;
}

export interface GigPlatformAdapter {
  platform: Platform;
  displayName: string;
  rideTypes: string[];
  isSupportedPackage(packageName: string): boolean;
  /** Cheap check: does this text look like an offer card / offer notification? */
  isOfferText(text: string): boolean;
  extractFare(text: string): ParsedField<number>;
  extractDistance(text: string): DistanceExtraction;
  extractDuration(text: string): ParsedField<number>;
  extractPickup(text: string): ParsedField<string>;
  extractDestination(text: string): ParsedField<string>;
  extractRideType(text: string): ParsedField<string>;
  parseOffer(text: string, source: OfferSource): ParseOutcome;
}

export type ParseOutcome =
  | { ok: true; offer: ParsedOffer }
  | { ok: false; error: string };

/** Shared assembly used by every adapter; each adapter supplies its own extractors. */
export function assembleOffer(adapter: GigPlatformAdapter, rawText: string, source: OfferSource): ParseOutcome {
  const text = normalizeText(rawText);
  if (!text) return { ok: false, error: "Empty text — unsupported screen." };
  if (!adapter.isOfferText(text)) return { ok: false, error: "Unsupported screen: no offer pattern found." };

  const fare = adapter.extractFare(text);
  const { pickup, total } = adapter.extractDistance(text);
  const offer: ParsedOffer = {
    platform: adapter.platform,
    source,
    fare,
    currency: parseCurrency(text),
    pickupDistance: pickup,
    totalDistance: total,
    estimatedDuration: adapter.extractDuration(text),
    pickupLocation: adapter.extractPickup(text),
    destination: adapter.extractDestination(text),
    rideType: adapter.extractRideType(text),
    surge: parseSurge(text),
    rawText: text.slice(0, 500),
    warnings: [],
  };
  if (fare.value == null) offer.warnings.push("Malformed offer: no fare detected.");
  if (total.value == null) offer.warnings.push("No distance detected.");
  if (offer.destination.value == null) offer.warnings.push("No destination detected.");
  return { ok: true, offer };
}
