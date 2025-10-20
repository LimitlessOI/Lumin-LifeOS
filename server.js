// Server configuration for PR auto-merging

const AUTO_MERGE_THRESHOLD = 0.8; // Changed from 0.9 to 0.8 to auto-merge PRs with 80%+ quality

function shouldAutoMerge(pr) {
    if (pr.type === 'strategic') {
        return false; // Requires manual approval from Adam
    }
    return pr.quality >= AUTO_MERGE_THRESHOLD; // Check quality against the threshold
}

// Additional logic to handle PRs goes here...
