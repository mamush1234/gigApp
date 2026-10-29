// Core domain models for GigPilot. Pure TypeScript — no React / RN imports,
// so the rule engine and parsers can be unit-tested with plain Node.

export const PLATFORMS = ["UBER", "LYFT", "UNKNOWN"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const SUPPORTED_PLATFORMS: Platform[] = ["UBER", "LYFT"];

export type MatchResult = "MATCH" | "NO_MATCH" | "REVIEW" | "UNKNOWN";
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "UNKNOWN";
export type OfferSource = "ACCESSIBILITY" | "NOTIFICATION" | "DEMO" | "MANUAL";

export interface ParsedField<T> {
  value: T | null; // null === UNKNOWN. Never guessed.
  confidence: Confidence;
}

export const unknownField = <T>(): ParsedField<T> => ({ value: null, confidence: "UNKNOWN" });
export const field = <T>(value: T, confidence: Confidence): ParsedField<T> => ({ value, confidence });

export interface ParsedOffer {
  platform: Platform;
  source: OfferSource;
  fare: ParsedField<number>;
  currency: ParsedField<Currency>;
  pickupDistance: ParsedField<number>; // miles
  totalDistance: ParsedField<number>; // miles (trip)
  estimatedDuration: ParsedField<number>; // minutes (trip)
  pickupLocation: ParsedField<string>;
  destination: ParsedField<string>;
  rideType: ParsedField<string>;
  surge: ParsedField<string>;
  rawText: string;
  warnings: string[];
}

export type RuleId =
  | "PLATFORM_ALLOWED"
  | "RIDE_TYPE_ALLOWED"
  | "EXCLUDED_PICKUP"
  | "EXCLUDED_DESTINATION"
  | "MINIMUM_FARE"
  | "MAXIMUM_FARE"
  | "MAXIMUM_PICKUP_DISTANCE"
  | "MAXIMUM_TRIP_DISTANCE"
  | "MINIMUM_TRIP_DISTANCE"
  | "MINIMUM_DOLLAR_PER_MILE"
  | "MINIMUM_DOLLAR_PER_HOUR"
  | "PREFERRED_PICKUP"
  | "PREFERRED_DESTINATION";

export interface RuleCheck {
  id: RuleId;
  label: string;
  passed: boolean;
  hard: boolean; // hard rule failure => NO_MATCH
  detail: string; // human readable, e.g. "Fare $28.50 ≥ $25.00"
}

export interface RuleEvaluation {
  matched: boolean;
  result: MatchResult;
  score: number; // 0..100
  reasons: string[];
  failedRules: RuleCheck[];
  passedRules: RuleCheck[];
  warnings: string[];
  dollarsPerMile: number | null;
  dollarsPerHour: number | null;
  missingCritical: string[];
}

export type ConfidenceMap = {
  fare: Confidence;
  currency: Confidence;
  pickupDistance: Confidence;
  totalDistance: Confidence;
  estimatedDuration: Confidence;
  pickupLocation: Confidence;
  destination: Confidence;
  rideType: Confidence;
  surge: Confidence;
};

export interface Offer {
  id: string;
  platform: Platform;
  source: OfferSource;
  timestamp: string; // ISO
  fare: number | null;
  currency: Currency;
  pickupDistance: number | null;
  totalDistance: number | null;
  estimatedDuration: number | null;
  pickupLocation: string | null;
  destination: string | null;
  rideType: string | null;
  surge: string | null;
  rawText: string;
  matchResult: MatchResult;
  matchScore: number;
  rejectionReasons: string[];
  dollarsPerMile: number | null;
  confidence: ConfidenceMap;
  evaluation: RuleEvaluation;
}

export interface ScoringWeights {
  fare: number;
  dollarsPerMile: number;
  distance: number;
  preferredPickup: number;
  preferredDestination: number;
  rideType: number;
}

export interface ScoringConfig {
  weights: ScoringWeights;
  matchThreshold: number; // >= => MATCH
  reviewThreshold: number; // >= => REVIEW, below => NO_MATCH
  autoActionThreshold: number; // future automation module only
}

export interface Preferences {
  minimumFare: number | null;
  maximumFare: number | null;
  minimumDollarPerMile: number | null;
  minimumDollarPerHour: number | null;
  maximumPickupDistance: number | null;
  maximumTripDistance: number | null;
  minimumTripDistance: number | null;
  preferredPickupAreas: string[];
  preferredDestinationAreas: string[];
  excludedPickupAreas: string[];
  excludedDestinationAreas: string[];
  allowedRideTypes: string[]; // empty => all allowed
  blockedRideTypes: string[];
  allowedPlatforms: Platform[];
  preferredAreasOnly: boolean;
  allowMissingData: boolean;
  automationEnabled: boolean; // future module, OFF by default
  detectionEnabled: boolean;
  notificationMonitoringEnabled: boolean;
  resultNotificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showOverlay: boolean;
  saveOfferHistory: boolean;
  historyRetentionDays: number;
  currency: Currency;
  scoring: ScoringConfig;
}
