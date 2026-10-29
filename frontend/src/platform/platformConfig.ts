// Single source of truth for supported gig-app package identifiers.
// Update here if a platform changes its Android package name; the native
// services receive this list at runtime via configure().
import type { Platform } from "../domain/model";

export interface PlatformConfig {
  platform: Platform;
  displayName: string;
  packageNames: string[];
  brandColor: string; // brand color, identical in light & dark
}

export const PLATFORM_CONFIG: Record<"UBER" | "LYFT", PlatformConfig> = {
  UBER: {
    platform: "UBER",
    displayName: "Uber",
    packageNames: ["com.ubercab.driver"],
    brandColor: "#000000",
  },
  LYFT: {
    platform: "LYFT",
    displayName: "Lyft",
    packageNames: ["com.lyft.android.driver"],
    brandColor: "#FF00BF",
  },
};

export const ALL_SUPPORTED_PACKAGES = Object.values(PLATFORM_CONFIG).flatMap((c) => c.packageNames);

export const platformName = (p: Platform) =>
  p === "UBER" ? "Uber" : p === "LYFT" ? "Lyft" : "Unknown";
