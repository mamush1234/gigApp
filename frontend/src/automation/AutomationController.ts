// Future, separately controlled automation module. DISABLED in the MVP.
// It never interacts with Uber/Lyft. No bypass of app protections, anti-bot
// mechanisms, CAPTCHA or authentication will ever be implemented here.
import type { Offer, Preferences } from "../domain/model";

export interface AutomationDecision {
  eligible: boolean;
  message: string;
}

export interface AutomationController {
  evaluateOffer(offer: Offer, prefs: Preferences): AutomationDecision;
  prepareAction(offer: Offer): AutomationDecision;
  performPermittedAction(offer: Offer): Promise<AutomationDecision>;
}

const NOT_ENABLED = "Automation action not enabled.";

export const DisabledAutomationController: AutomationController = {
  evaluateOffer(offer, prefs) {
    if (!prefs.automationEnabled) return { eligible: false, message: NOT_ENABLED };
    if (offer.evaluation.missingCritical.length > 0)
      return { eligible: false, message: "Critical information is UNKNOWN — no action allowed." };
    if (offer.matchScore < prefs.scoring.autoActionThreshold)
      return { eligible: false, message: `Score below auto-action threshold (${prefs.scoring.autoActionThreshold}).` };
    return { eligible: false, message: "No permitted automation module is installed in this version. " + NOT_ENABLED };
  },
  prepareAction: () => ({ eligible: false, message: NOT_ENABLED }),
  performPermittedAction: async () => ({ eligible: false, message: NOT_ENABLED }),
};
