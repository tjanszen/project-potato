"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagService = exports.FeatureFlagService = void 0;
// Feature flag registry
const featureFlags = {
    'ff.potato.no_drink_v1': {
        name: 'ff.potato.no_drink_v1',
        enabled: false, // Default OFF as required - overridden by environment variable
        description: 'Main feature flag for No Drink tracking functionality',
    },
    'ff.potato.runs_v2': {
        name: 'ff.potato.runs_v2',
        enabled: false, // Default OFF as required - overridden by environment variable
        description: 'V2 feature flag for runs and totals tracking functionality',
    },
    'ff.potato.totals_v2': {
        name: 'ff.potato.totals_v2',
        enabled: false, // Default OFF as required - overridden by environment variable
        description: 'V2 feature flag for totals aggregation and API functionality',
    },
    'ff.potato.calendar_fix_v1': {
        name: 'ff.potato.calendar_fix_v1',
        enabled: false, // Default OFF - overridden by environment variable
        description: 'Fix for calendar API to use localDate instead of date field',
    },
};
class FeatureFlagService {
    constructor() {
        // Log feature flag status on startup
        this.logFlagStatus();
    }
    logFlagStatus() {
        const flagValue = process.env.FF_POTATO_NO_DRINK_V1;
        const runsV2FlagValue = process.env.FF_POTATO_RUNS_V2;
        const totalsV2FlagValue = process.env.FF_POTATO_TOTALS_V2;
        const calendarFixFlagValue = process.env.FF_POTATO_CALENDAR_FIX_V1;
        console.log(`[Feature Flag] FF_POTATO_NO_DRINK_V1 = ${flagValue || 'undefined'}`);
        console.log(`[Feature Flag] FF_POTATO_RUNS_V2 = ${runsV2FlagValue || 'undefined'}`);
        console.log(`[Feature Flag] FF_POTATO_TOTALS_V2 = ${totalsV2FlagValue || 'undefined'}`);
        console.log(`[Feature Flag] FF_POTATO_CALENDAR_FIX_V1 = ${calendarFixFlagValue || 'undefined'}`);
    }
    // Get a specific feature flag
    getFlag(flagName) {
        const baseFlag = featureFlags[flagName];
        if (!baseFlag)
            return null;
        // For ff.potato.no_drink_v1, read from environment variable
        if (flagName === 'ff.potato.no_drink_v1') {
            const envValue = process.env.FF_POTATO_NO_DRINK_V1;
            const enabled = envValue === 'true'; // Only 'true' string enables it
            return Object.assign(Object.assign({}, baseFlag), { enabled });
        }
        // For ff.potato.runs_v2, read from environment variable
        if (flagName === 'ff.potato.runs_v2') {
            const envValue = process.env.FF_POTATO_RUNS_V2;
            const enabled = envValue === 'true'; // Only 'true' string enables it
            return Object.assign(Object.assign({}, baseFlag), { enabled });
        }
        // For ff.potato.totals_v2, read from environment variable
        if (flagName === 'ff.potato.totals_v2') {
            const envValue = process.env.FF_POTATO_TOTALS_V2;
            const enabled = envValue === 'true'; // Only 'true' string enables it
            return Object.assign(Object.assign({}, baseFlag), { enabled });
        }
        // For ff.potato.calendar_fix_v1, read from environment variable
        if (flagName === 'ff.potato.calendar_fix_v1') {
            const envValue = process.env.FF_POTATO_CALENDAR_FIX_V1;
            const enabled = envValue === 'true'; // Only 'true' string enables it
            return Object.assign(Object.assign({}, baseFlag), { enabled });
        }
        return baseFlag;
    }
    // Check if a feature is enabled
    isEnabled(flagName) {
        const flag = this.getFlag(flagName);
        return flag ? flag.enabled : false;
    }
    // Get all feature flags
    getAllFlags() {
        return Object.assign({}, featureFlags);
    }
    // Toggle a feature flag (for testing/admin purposes)
    toggleFlag(flagName) {
        if (featureFlags[flagName]) {
            featureFlags[flagName].enabled = !featureFlags[flagName].enabled;
            return featureFlags[flagName].enabled;
        }
        return false;
    }
    // Set a specific flag state
    setFlag(flagName, enabled) {
        if (featureFlags[flagName]) {
            featureFlags[flagName].enabled = enabled;
            return true;
        }
        return false;
    }
}
exports.FeatureFlagService = FeatureFlagService;
// Export singleton instance
exports.featureFlagService = new FeatureFlagService();
