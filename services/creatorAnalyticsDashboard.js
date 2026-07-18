/**
 * SYNOPSIS: Existing code and exports
 */
// Existing code and exports
// (Assuming this is the current content of services/creatorAnalyticsDashboard.js)

// Add the named export `ingestPerformance` as specified in the task

export function ingestPerformance(postMetrics) {
    const platformInsights = {};

    postMetrics.forEach(metric => {
        const { platform, hook, cta, performance } = metric;
        
        if (!platformInsights[platform]) {
            platformInsights[platform] = { hooks: {}, ctas: {} };
        }

        if (!platformInsights[platform].hooks[hook]) {
            platformInsights[platform].hooks[hook] = { totalPerformance: 0, count: 0 };
        }

        if (!platformInsights[platform].ctas[cta]) {
            platformInsights[platform].ctas[cta] = { totalPerformance: 0, count: 0 };
        }

        platformInsights[platform].hooks[hook].totalPerformance += performance;
        platformInsights[platform].hooks[hook].count += 1;

        platformInsights[platform].ctas[cta].totalPerformance += performance;
        platformInsights[platform].ctas[cta].count += 1;
    });

    const winners = {};

    for (const [platform, insights] of Object.entries(platformInsights)) {
        winners[platform] = {
            topHook: findTopPerformer(insights.hooks),
            topCta: findTopPerformer(insights.ctas),
        };
    }

    return winners;
}

function findTopPerformer(performanceData) {
    let topPerformer = null;
    let bestAveragePerformance = -Infinity;

    for (const [key, data] of Object.entries(performanceData)) {
        const averagePerformance = data.totalPerformance / data.count;

        if (averagePerformance > bestAveragePerformance) {
            topPerformer = key;
            bestAveragePerformance = averagePerformance;
        }
    }

    return topPerformer;
}

// Ensure to preserve existing exports
