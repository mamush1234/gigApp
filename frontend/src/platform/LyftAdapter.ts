// Lyft Driver specific parsing heuristics.
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

const LYFT_RIDE_TYPES = ["Lyft XL", "Lyft Lux", "Lux Black", "Extra Comfort", "Priority Pickup", "Wait & Save", "Lyft"];

// Lyft cards: "3 min (0.9 mi) away", "Trip: 15 min · 6.1 mi" / "15 min (6.1 mi) ride"
const PICKUP_WORDS = /\b(away|pickup|pick-up|to pickup)\b/i;
const TRIP_WORDS = /\b(trip|ride|total)\b/i;

export const LyftAdapter: GigPlatformAdapter = {
  platform: "LYFT",
  displayName: "Lyft",
  rideTypes: LYFT_RIDE_TYPES,
  isSupportedPackage: (pkg) => PLATFORM_CONFIG.LYFT.packageNames.includes(pkg),
  isOfferText: (t) => /[$€£]\s?\d/.test(t) || /\b(request|accept|ride)\b/i.test(t),
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
  extractRideType: (t) => parseRideType(t, LYFT_RIDE_TYPES),
  parseOffer(text, source) {
    return assembleOffer(this, text, source);
  },
};
