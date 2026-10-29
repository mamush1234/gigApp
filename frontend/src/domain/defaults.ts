import type { Preferences, ScoringConfig } from "./model";

export const RIDE_TYPES = [
  "UberX",
  "Uber Comfort",
  "Uber XL",
  "Uber Black",
  "Lyft",
  "Lyft XL",
  "Other",
];

export const DEFAULT_SCORING: ScoringConfig = {
  weights: {
    fare: 20,
    dollarsPerMile: 25,
    distance: 15,
    preferredPickup: 15,
    preferredDestination: 15,
    rideType: 10,
  },
  matchThreshold: 80,
  reviewThreshold: 60,
  autoActionThreshold: 80,
};

export const DEFAULT_PREFERENCES: Preferences = {
  minimumFare: 25,
  maximumFare: null,
  minimumDollarPerMile: 2,
  minimumDollarPerHour: 30,
  maximumPickupDistance: 5,
  maximumTripDistance: 25,
  minimumTripDistance: 2,
  preferredPickupAreas: ["Alexandria", "Arlington"],
  preferredDestinationAreas: [],
  excludedPickupAreas: [],
  excludedDestinationAreas: ["Washington DC"],
  allowedRideTypes: [...RIDE_TYPES],
  blockedRideTypes: [],
  allowedPlatforms: ["UBER", "LYFT"],
  preferredAreasOnly: false,
  allowMissingData: false,
  automationEnabled: false,
  detectionEnabled: false,
  notificationMonitoringEnabled: true,
  resultNotificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  showOverlay: true,
  saveOfferHistory: true,
  historyRetentionDays: 30,
  currency: "USD",
  scoring: DEFAULT_SCORING,
};
