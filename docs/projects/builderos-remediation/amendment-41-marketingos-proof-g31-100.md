<!-- SYNOPSIS: Proof-Closing Blueprint Note: Amendment 41 MarketingOS G31-100 -->

# Proof-Closing Blueprint Note: Amendment 41 MarketingOS G31-100

This document serves as a proof-closing blueprint note for the implementation of MarketingOS metric G31-100, as specified by `AMENDMENT_41_MARKETINGOS.md`.

---

### 1. Exact missing implementation or proof gap

The `AMENDMENT_41_MARKETINGOS.md` blueprint specifies the requirement for MarketingOS to expose a new aggregated performance metric, `G31-100`, for active campaigns. The current LifeOS platform lacks a dedicated, production-ready API endpoint and the underlying service logic to calculate and serve this specific metric. The proof gap is the absence of this verifiable data exposure.

### 2. Smallest safe build slice to close it

Implement a new read-only API endpoint within the MarketingOS domain to expose the aggregated `G31-100` metric. This slice will:
1.  Define a new GET route: `/marketingos/v1/campaigns/metrics/g31-100`.
2.  Implement a controller function to handle requests to this route, including basic input validation for optional query parameters (e.g., `campaignId`).
3.  Implement a service layer function responsible for fetching raw campaign data, performing the `G31-100` aggregation logic, and returning the calculated metric. This function will leverage existing data access patterns.

### 3. Exact safe-scope files to touch first

-   `src/api/marketingos/routes/campaignRoutes.js`: Extend with the new GET route definition.
-   `src/api/marketingos/controllers/campaignMetricsController.js`: Create a new controller file or extend an existing one to house the `getG31_100Metric` function.
-   `src/services/marketingos/campaignMetricsService.js`: Create a new service file or extend an existing one to encapsulate the `calculateG31_100` logic.
-   `src/data/marketingos/campaignRepository.js`: Potentially extend with a new method to fetch specific raw data required for G31-100 calculation,