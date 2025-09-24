"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagService = exports.FeatureFlagService = void 0;

// Feature flag registry
const featureFlags = {
    'ff.potato.no_drink_v1': {
        name: 'ff.potato.no_drink_v1',
        enabled: false,
        description: 'Main feature flag for No Drink tracking functionality',
    },
    'ff.potato.runs_v2': {
        name: 'ff.potato.runs_v2',
        enabled: false,
        description: 'V2 feature flag for runs and totals tracking functionality',
    },
    'ff.potato.totals_v2': {
        name: 'ff.potato.totals_v2',
        enabled: false,
        description: 'V2 feature flag for totals aggregation and API functionality',
    },
    'ff.potato.dev_rate_limit': {
        name: 'ff.potato.dev_rate_limit',
        enabled: false,
        description: 'Dev-friendly rate limiting with higher limits for testing',
    },
    'ff.potato.totals_v3': {
        name: 'ff.potato.totals_v3',
        enabled: false,
        description: 'V3 feature flag for totals calculation with MAX(end_date) logic',
    },
    'ff.potato.progress_header_v2': {
        name: 'ff.potato.progress_header_v2',
        enabled: false,
        description: 'V2 feature flag for removing progress header and container styling',
    },
    'ff.potato.bottom_nav': {
        name: 'ff.potato.bottom_nav',
        enabled: false,
        description: 'Mobile-only sticky bottom navigation bar',
    },
    'ff.potato.leagues_placeholder': {
        name: 'ff.potato.leagues_placeholder',
        enabled: false,
        description: 'Enables Leagues page with placeholder cards for testing',
    },
    'ff.potato.leagues_tabs': {
        name: 'ff.potato.leagues_tabs',
        enabled: false,
        description: 'Enables tabbed interface (Active, List, Clubs) for Leagues page',
    },
};

class FeatureFlagService {
    constructor() {
        // Normalize env vars: accept "true", "True", "1"
        const normalize = (val) => {
            if (!val) return false;
            return ['true', '1'].includes(val.toString().toLowerCase());
        };

        // Hydrate registry from environment variables
        featureFlags['ff.potato.no_drink_v1'].enabled = normalize(process.env.FF_POTATO_NO_DRINK_V1);
        featureFlags['ff.potato.runs_v2'].enabled = normalize(process.env.FF_POTATO_RUNS_V2);
        featureFlags['ff.potato.totals_v2'].enabled = normalize(process.env.FF_POTATO_TOTALS_V2);
        featureFlags['ff.potato.dev_rate_limit'].enabled = normalize(process.env.FF_POTATO_DEV_RATE_LIMIT);
        featureFlags['ff.potato.totals_v3'].enabled = normalize(process.env.FF_POTATO_TOTALS_V3);
        featureFlags['ff.potato.progress_header_v2'].enabled = normalize(process.env.FF_POTATO_PROGRESS_HEADER_V2);
        featureFlags['ff.potato.bottom_nav'].enabled = normalize(process.env.FF_POTATO_BOTTOM_NAV);
        featureFlags['ff.potato.leagues_placeholder'].enabled = normalize(process.env.FF_POTATO_LEAGUES_PLACEHOLDER);
        featureFlags['ff.potato.leagues_tabs'].enabled = normalize(process.env.FF_POTATO_LEAGUES_TABS);

        // Log feature flag status on startup
        this.logFlagStatus();
    }

    logFlagStatus() {
        for (const [key, flag] of Object.entries(featureFlags)) {
            console.log(`[Feature Flag] ${key} = ${flag.enabled}`);
        }
    }

    // ✅ Always return hydrated flag
    getFlag(flagName) {
        const baseFlag = featureFlags[flagName];
        if (!baseFlag) return null;
        return { ...baseFlag };
    }

    isEnabled(flagName) {
        const flag = this.getFlag(flagName);
        return flag ? flag.enabled : false;
    }

    getAllFlags() {
        return {
            'ff.potato.no_drink_v1': this.getFlag('ff.potato.no_drink_v1'),
            'ff.potato.runs_v2': this.getFlag('ff.potato.runs_v2'),
            'ff.potato.totals_v2': this.getFlag('ff.potato.totals_v2'),
            'ff.potato.dev_rate_limit': this.getFlag('ff.potato.dev_rate_limit'),
            'ff.potato.totals_v3': this.getFlag('ff.potato.totals_v3'),
            'ff.potato.progress_header_v2': this.getFlag('ff.potato.progress_header_v2'),
            'ff.potato.bottom_nav': this.getFlag('ff.potato.bottom_nav'),
            'ff.potato.leagues_placeholder': this.getFlag('ff.potato.leagues_placeholder'),
            'ff.potato.leagues_tabs': this.getFlag('ff.potato.leagues_tabs'),
        };
    }

    toggleFlag(flagName) {
        if (featureFlags[flagName]) {
            featureFlags[flagName].enabled = !featureFlags[flagName].enabled;
            return featureFlags[flagName].enabled;
        }
        return false;
    }

    setFlag(flagName, enabled) {
        if (featureFlags[flagName]) {
            featureFlags[flagName].enabled = enabled;
            return true;
        }
        return false;
    }
}

exports.FeatureFlagService = FeatureFlagService;
exports.featureFlagService = new FeatureFlagService();
