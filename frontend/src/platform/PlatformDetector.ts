import type { Platform } from "../domain/model";
import type { GigPlatformAdapter } from "./GigPlatformAdapter";
import { LyftAdapter } from "./LyftAdapter";
import { UberAdapter } from "./UberAdapter";

// Register new platforms (DoorDash, Instacart, …) here.
export const ADAPTERS: GigPlatformAdapter[] = [UberAdapter, LyftAdapter];

/** Returns the adapter for a package, or null for any unrelated app (ignored). */
export function detectPlatform(packageName: string): GigPlatformAdapter | null {
  return ADAPTERS.find((a) => a.isSupportedPackage(packageName)) ?? null;
}

export function getAdapter(platform: Platform): GigPlatformAdapter | null {
  return ADAPTERS.find((a) => a.platform === platform) ?? null;
}
