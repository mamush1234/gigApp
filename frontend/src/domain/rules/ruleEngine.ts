// Platform-independent rule engine. Input: ParsedOffer-like values + Preferences.
// Output: RuleEvaluation. Contains NO Uber/Lyft specific logic.
import type { MatchResult, ParsedOffer, Preferences, RuleCheck, RuleEvaluation, RuleId } from "../model";
import { money, round1, round2 } from "../format";

export interface EvaluableOffer {
  platform: ParsedOffer["platform"];
  fare: number | null;
  currency: ParsedOffer["currency"]["value"];
  pickupDistance: number | null;
  totalDistance: number | null;
  estimatedDuration: number | null;
  pickupLocation: string | null;
  destination: string | null;
  rideType: string | null;
}

export function toEvaluable(p: ParsedOffer): EvaluableOffer {
  return {
    platform: p.platform,
    fare: p.fare.value,
    currency: p.currency.value,
    pickupDistance: p.pickupDistance.value,
    totalDistance: p.totalDistance.value,
    estimatedDuration: p.estimatedDuration.value,
    pickupLocation: p.pickupLocation.value,
    destination: p.destination.value,
    rideType: p.rideType.value,
  };
}

export function dollarsPerMile(fare: number | null, distance: number | null): number | null {
  if (fare == null || distance == null || distance <= 0) return null;
  return round2(fare / distance);
}

export function dollarsPerHour(fare: number | null, durationMin: number | null): number | null {
  if (fare == null || durationMin == null || durationMin <= 0) return null;
  return round2(fare / (durationMin / 60));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Case/punctuation-insensitive area match: "Washington, DC" matches "Washington DC". */
export function areaMatches(location: string | null, areas: string[]): string | null {
  if (!location) return null;
  const loc = norm(location);
  for (const a of areas) {
    const n = norm(a);
    if (n && loc.includes(n)) return a;
  }
  return null;
}

function rideTypeIn(rideType: string, list: string[]): boolean {
  const r = norm(rideType);
  return list.some((t) => norm(t) === r);
}

export function evaluateOffer(offer: EvaluableOffer, prefs: Preferences): RuleEvaluation {
  const checks: RuleCheck[] = [];
  const warnings: string[] = [];
  const missingCritical: string[] = [];
  const w = prefs.scoring.weights;
  let score = 0;

  const add = (id: RuleId, label: string, passed: boolean, hard: boolean, detail: string) =>
    checks.push({ id, label, passed, hard, detail });

  const dpm = dollarsPerMile(offer.fare, offer.totalDistance);
  const dph = dollarsPerHour(offer.fare, offer.estimatedDuration);

  if (offer.fare == null) {
    missingCritical.push("fare");
    warnings.push("Offer detected, but fare could not be identified.");
  }
  if (offer.totalDistance == null) {
    missingCritical.push("distance");
    warnings.push("Offer detected, but trip distance could not be identified.");
  }
  if (offer.pickupLocation == null) warnings.push("Pickup area could not be identified.");
  if (offer.destination == null) warnings.push("Offer detected, but destination could not be identified.");
  if (offer.currency === "UNKNOWN" && offer.fare != null) warnings.push("Fare currency could not be identified.");
  else if (offer.currency && offer.currency !== "UNKNOWN" && offer.currency !== prefs.currency)
    warnings.push(`Fare is in ${offer.currency}; your rules use ${prefs.currency}. Review manually.`);

  // 1. Platform allowed
  const platformOk = prefs.allowedPlatforms.includes(offer.platform);
  add("PLATFORM_ALLOWED", "Platform allowed", platformOk, true,
    platformOk ? `${offer.platform} is enabled` : `${offer.platform} is not an enabled platform`);

  // 2. Ride type allowed
  if (offer.rideType == null) {
    warnings.push("Ride type could not be identified.");
  } else {
    const blocked = rideTypeIn(offer.rideType, prefs.blockedRideTypes);
    const allowedList = prefs.allowedRideTypes;
    const known = allowedList.length === 0 || rideTypeIn(offer.rideType, allowedList) ||
      (rideTypeIn("Other", allowedList) && !rideTypeIn(offer.rideType, KNOWN_TYPES_FALLBACK));
    const ok = !blocked && known;
    add("RIDE_TYPE_ALLOWED", "Ride type", ok, true,
      ok ? `${offer.rideType} is allowed` : `${offer.rideType} is ${blocked ? "blocked" : "not allowed"}`);
    if (ok) score += w.rideType;
  }

  // 3. Excluded pickup area
  const exPick = areaMatches(offer.pickupLocation, prefs.excludedPickupAreas);
  if (prefs.excludedPickupAreas.length && offer.pickupLocation != null)
    add("EXCLUDED_PICKUP", "Pickup not excluded", !exPick, true,
      exPick ? `Pickup in excluded area ${exPick}` : "Pickup not in an excluded area");

  // 4. Excluded destination area
  const exDest = areaMatches(offer.destination, prefs.excludedDestinationAreas);
  if (prefs.excludedDestinationAreas.length && offer.destination != null)
    add("EXCLUDED_DESTINATION", "Destination not excluded", !exDest, true,
      exDest ? `Destination in excluded area ${exDest}` : "Destination not in an excluded area");

  // 5. Minimum fare (+ optional maximum fare)
  if (offer.fare != null) {
    if (prefs.minimumFare != null) {
      const ok = offer.fare >= prefs.minimumFare;
      add("MINIMUM_FARE", "Minimum fare", ok, true,
        ok ? `Fare ${money(offer.fare)} ≥ ${money(prefs.minimumFare)}` : `Fare ${money(offer.fare)} below ${money(prefs.minimumFare)}`);
      if (ok) score += w.fare;
    } else score += w.fare;
    if (prefs.maximumFare != null) {
      const ok = offer.fare <= prefs.maximumFare;
      add("MAXIMUM_FARE", "Maximum fare", ok, true,
        ok ? `Fare ${money(offer.fare)} ≤ ${money(prefs.maximumFare)}` : `Fare ${money(offer.fare)} above ${money(prefs.maximumFare)}`);
    }
  }

  // 6–8. Distances
  let distanceOk = offer.totalDistance != null;
  if (prefs.maximumPickupDistance != null) {
    if (offer.pickupDistance == null) warnings.push("Pickup distance could not be identified.");
    else {
      const ok = offer.pickupDistance <= prefs.maximumPickupDistance;
      add("MAXIMUM_PICKUP_DISTANCE", "Maximum pickup distance", ok, true,
        ok ? `Pickup ${round1(offer.pickupDistance)} mi ≤ ${prefs.maximumPickupDistance} mi`
          : `Pickup ${round1(offer.pickupDistance)} mi above ${prefs.maximumPickupDistance} mi`);
      distanceOk = distanceOk && ok;
    }
  }
  if (offer.totalDistance != null) {
    if (prefs.maximumTripDistance != null) {
      const ok = offer.totalDistance <= prefs.maximumTripDistance;
      add("MAXIMUM_TRIP_DISTANCE", "Maximum trip distance", ok, true,
        ok ? `${round1(offer.totalDistance)} miles ≤ ${prefs.maximumTripDistance}`
          : `Distance above ${prefs.maximumTripDistance} miles (${round1(offer.totalDistance)} mi)`);
      distanceOk = distanceOk && ok;
    }
    if (prefs.minimumTripDistance != null) {
      const ok = offer.totalDistance >= prefs.minimumTripDistance;
      add("MINIMUM_TRIP_DISTANCE", "Minimum trip distance", ok, true,
        ok ? `${round1(offer.totalDistance)} miles ≥ ${prefs.minimumTripDistance}`
          : `Distance below ${prefs.minimumTripDistance} miles (${round1(offer.totalDistance)} mi)`);
      distanceOk = distanceOk && ok;
    }
  }
  if (distanceOk) score += w.distance;

  // 9. Minimum $/mile
  if (dpm != null) {
    if (prefs.minimumDollarPerMile != null) {
      const ok = dpm >= prefs.minimumDollarPerMile;
      add("MINIMUM_DOLLAR_PER_MILE", "Minimum $/mile", ok, true,
        ok ? `$${dpm.toFixed(2)}/mile ≥ ${money(prefs.minimumDollarPerMile)}`
          : `$/mile below ${money(prefs.minimumDollarPerMile)} ($${dpm.toFixed(2)})`);
      if (ok) score += w.dollarsPerMile;
    } else score += w.dollarsPerMile;
  }

  // 10. Minimum $/hour
  if (prefs.minimumDollarPerHour != null) {
    if (dph == null) warnings.push("Estimated $/hour unavailable (no trip duration).");
    else {
      const ok = dph >= prefs.minimumDollarPerHour;
      add("MINIMUM_DOLLAR_PER_HOUR", "Minimum $/hour", ok, true,
        ok ? `$${dph.toFixed(2)}/hr ≥ ${money(prefs.minimumDollarPerHour)}`
          : `$/hour below ${money(prefs.minimumDollarPerHour)} ($${dph.toFixed(2)})`);
    }
  }

  // 11. Preferred area bonus (hard only when preferredAreasOnly)
  const prefBonus = (id: RuleId, label: string, loc: string | null, areas: string[], weight: number) => {
    if (areas.length === 0) { score += weight; return; }
    if (loc == null) return;
    const hit = areaMatches(loc, areas);
    add(id, label, !!hit, prefs.preferredAreasOnly,
      hit ? `${label}: ${hit}` : `${loc} is not a ${label.toLowerCase()}`);
    if (hit) score += weight;
  };
  prefBonus("PREFERRED_PICKUP", "Preferred pickup area", offer.pickupLocation, prefs.preferredPickupAreas, w.preferredPickup);
  prefBonus("PREFERRED_DESTINATION", "Preferred destination", offer.destination, prefs.preferredDestinationAreas, w.preferredDestination);

  const totalWeight = w.fare + w.dollarsPerMile + w.distance + w.preferredPickup + w.preferredDestination + w.rideType;
  const normalized = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;

  const failedRules = checks.filter((c) => !c.passed);
  const passedRules = checks.filter((c) => c.passed);
  const hardFail = failedRules.some((c) => c.hard);

  let result: MatchResult;
  if (hardFail) result = "NO_MATCH";
  else if (offer.fare == null && !prefs.allowMissingData) result = "UNKNOWN";
  else if (normalized >= prefs.scoring.matchThreshold) result = "MATCH";
  else if (normalized >= prefs.scoring.reviewThreshold) result = "REVIEW";
  else result = "NO_MATCH";

  // Never auto-MATCH with missing critical data or a currency mismatch, unless allowed.
  const currencyMismatch = offer.currency != null && offer.currency !== "UNKNOWN" && offer.currency !== prefs.currency;
  if (result === "MATCH" && !prefs.allowMissingData && (missingCritical.length > 0 || currencyMismatch)) result = "REVIEW";

  const reasons = [
    ...passedRules.map((c) => `✓ ${c.detail}`),
    ...failedRules.map((c) => `✗ ${c.detail}`),
  ];

  return {
    matched: result === "MATCH",
    result,
    score: normalized,
    reasons,
    failedRules,
    passedRules,
    warnings,
    dollarsPerMile: dpm,
    dollarsPerHour: dph,
    missingCritical,
  };
}

// Ride types GigPilot knows by name; anything else falls under "Other".
const KNOWN_TYPES_FALLBACK = ["UberX", "Uber Comfort", "Uber XL", "Uber Black", "Lyft", "Lyft XL"];
