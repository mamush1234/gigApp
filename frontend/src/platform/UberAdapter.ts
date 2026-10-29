// Uber Driver specific parsing heuristics. Uber's UI changes often — keep all
// Uber-specific patterns here, never in the generic engine.
import type { GigPlatformAdapter } from "./GigPlatformAdapter";
import { assembleOffer } from "./GigPlatformAdapter";
import { PLATFORM_CONFIG } from "./platformConfig";
import { field, unknownField } from "../domain/model";
import {
  classifyByContext,
  findDistances,
  findDurations,
  parseFare,
  parseRideType,
  parseRoute,
} from "./offerParser";

const UBER_RIDE_TYPES = ["UberX", "UberXL", "Uber XL", "Uber Comfort", "Comfort", "Uber Black", "Black SUV", "Uber Green", "UberX Share", "Uber Pet"];
const CANONICAL: Record<string, string> = { UberXL: "Uber XL", Comfort: "Uber Comfort", "Black SUV": "Uber Black" };

// Uber cards: "4 min (1.1 mi) away" and "18 min (8.0 mi) trip"
const PICKUP_WORDS = /\b(away|pickup|pick-up)\b/i;
const TRIP_WORDS = /\b(trip|total)\b/i;

export const UberAdapter: GigPlatformAdapter = {
  platform: "UBER",
  displayName: "Uber",
  rideTypes: UBER_RIDE_TYPES,
  isSupportedPackage: (pkg) => PLATFORM_CONFIG.UBER.packageNames.includes(pkg),
  isOfferText: (t) => /[$€£]\s?\d/.test(t) || /\b(request|accept|trip|ride)\b/i.test(t),
  extractFare: (t) => parseFare(t),
  extractDistance: (t) => {
    const c = classifyByContext(findDistances(t), PICKUP_WORDS, TRIP_WORDS);
    return {
      pickup: c.pickup ? field(c.pickup.miles, c.pickupConfidence) : unknownField(),
      total: c.trip ? field(c.trip.miles, c.tripConfidence) : unknownField(),
    };
  },
  extractDuration: (t) => {
    const c = classifyByContext(findDurations(t), PICKUP_WORDS, TRIP_WORDS);
    return c.trip ? field(c.trip.minutes, c.tripConfidence) : unknownField();
  },
  extractPickup: (t) => parseRoute(t).pickup,
  extractDestination: (t) => parseRoute(t).destination,
  extractRideType: (t) => {
    const r = parseRideType(t, UBER_RIDE_TYPES);
    return r.value ? field(CANONICAL[r.value] ?? r.value, r.confidence) : r;
  },
  parseOffer(text, source) {
    return assembleOffer(this, text, source);
  },
};
