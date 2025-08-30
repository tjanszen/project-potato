// Feature flag system for gating functionality
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
}

// Feature flag registry
const featureFlags: Record<string, FeatureFlag> = {
  'ff.potato.no_drink_v1': {
    name: 'ff.potato.no_drink_v1',
    enabled: false, // Default OFF as required
    description: 'Main feature flag for No Drink tracking functionality',
  },
};

export class FeatureFlagService {
  // Get a specific feature flag
  getFlag(flagName: string): FeatureFlag | null {
    return featureFlags[flagName] || null;
  }

  // Check if a feature is enabled
  isEnabled(flagName: string): boolean {
    const flag = this.getFlag(flagName);
    return flag ? flag.enabled : false;
  }

  // Get all feature flags
  getAllFlags(): Record<string, FeatureFlag> {
    return { ...featureFlags };
  }

  // Toggle a feature flag (for testing/admin purposes)
  toggleFlag(flagName: string): boolean {
    if (featureFlags[flagName]) {
      featureFlags[flagName].enabled = !featureFlags[flagName].enabled;
      return featureFlags[flagName].enabled;
    }
    return false;
  }

  // Set a specific flag state
  setFlag(flagName: string, enabled: boolean): boolean {
    if (featureFlags[flagName]) {
      featureFlags[flagName].enabled = enabled;
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();