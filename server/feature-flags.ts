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
    enabled: false, // Default OFF as required - overridden by environment variable
    description: 'Main feature flag for No Drink tracking functionality',
  },
  'ff.potato.runs_v2': {
    name: 'ff.potato.runs_v2',
    enabled: true, // Default ON for Phase 6E-Lite cutover - overridden by environment variable
    description: 'V2 feature flag for runs and totals tracking functionality',
  },
  'ff.potato.calendar_fix_v1': {
    name: 'ff.potato.calendar_fix_v1',
    enabled: false, // Default OFF - overridden by environment variable
    description: 'Fix for calendar API to use localDate instead of date field',
  },
};

export class FeatureFlagService {
  constructor() {
    // Log feature flag status on startup
    this.logFlagStatus();
  }

  private logFlagStatus(): void {
    const v1Flag = process.env.FF_POTATO_NO_DRINK_V1;
    const v2Flag = process.env.FF_POTATO_RUNS_V2;
    const calendarFixFlag = process.env.FF_POTATO_CALENDAR_FIX_V1;
    console.log(`[Feature Flag] FF_POTATO_NO_DRINK_V1 = ${v1Flag || 'undefined'}`);
    console.log(`[Feature Flag] FF_POTATO_RUNS_V2 = ${v2Flag || 'undefined'}`);
    console.log(`[Feature Flag] FF_POTATO_CALENDAR_FIX_V1 = ${calendarFixFlag || 'undefined'}`);
  }

  // Get a specific feature flag
  getFlag(flagName: string): FeatureFlag | null {
    const baseFlag = featureFlags[flagName];
    if (!baseFlag) return null;

    // For ff.potato.no_drink_v1, read from environment variable
    if (flagName === 'ff.potato.no_drink_v1') {
      const envValue = process.env.FF_POTATO_NO_DRINK_V1;
      const enabled = envValue === 'true'; // Only 'true' string enables it
      return {
        ...baseFlag,
        enabled
      };
    }

    // For ff.potato.runs_v2, read from environment variable
    if (flagName === 'ff.potato.runs_v2') {
      const envValue = process.env.FF_POTATO_RUNS_V2;
      const enabled = envValue === 'true'; // Only 'true' string enables it
      return {
        ...baseFlag,
        enabled
      };
    }

    // For ff.potato.calendar_fix_v1, read from environment variable
    if (flagName === 'ff.potato.calendar_fix_v1') {
      const envValue = process.env.FF_POTATO_CALENDAR_FIX_V1;
      const enabled = envValue === 'true'; // Only 'true' string enables it
      return {
        ...baseFlag,
        enabled
      };
    }

    return baseFlag;
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