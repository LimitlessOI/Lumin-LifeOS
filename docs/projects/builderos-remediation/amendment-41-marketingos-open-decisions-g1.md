<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Open Decisions G1. -->

Amendment 41 (MarketingOS) - Open Decisions & Next Steps (G1)

This memo outlines the blocking founder decisions for Amendment 41 (MarketingOS) and proposes the smallest buildable next slice that does not violate the blueprint.

1. Blocking Ambiguity / Founder Decision List
The following decisions are required from the founder to proceed with core implementation:
    - **Amendment 23 Relationship:** How should Amendment 23 (Creator Media OS) relate to Amendment 41?
        - (A) Keep as a separate sibling under LimitlessOS (recommended)
        - (B) Absorb into Amendment 41 as Phase X (Likeness Studio)
        - (C) Deprecate Amendment 23 and rebuild its scope within Amendment 41
    - **Pricing Lead:** Which pricing model should be prioritized on the first landing page?
        - (A) $49/session (easier to buy)
        - (B) $199/month (recurring commitment)
    - **First Vertical Target:** Which vertical should be targeted initially for coaching prompts?
        - (A) Real estate agents
        - (B) Wellness coaches
        - (C) SaaS founders

2. Already-Settled Constraints
    - Source blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`.
    - Amendment 23 (Creator Media OS) is 0% built and its owned files do not exist.
    - BuilderOS-only governed loop execution.
    - No modification of LifeOS user features or TSOS customer-facing surfaces.

3. Smallest Buildable Next Slice
Given that founder decisions currently block direct code start for specific pricing and vertical logic, the smallest buildable next slice focuses on establishing the foundational structure and configuration points. This slice enables subsequent rapid development once decisions are finalized.

    - **Configuration Definition:** Define the configuration schema and default values for the open decisions. This includes:
        - `marketingOs.amendment23Relationship`: (e.g., 'sibling', 'absorbed', 'deprecated')
        - `marketingOs.pricingLead`: (e.g., 'session', 'monthly')
        - `marketingOs.targetVertical`: (e.g., 'realEstate', 'wellness', 'saas')
    - **Core Module Scaffolding:** Create the basic directory structure and placeholder files for the MarketingOS module.
    - **Stripe Integration Setup (Agnostic):** Initialize Stripe API client and define placeholder product/price creation functions that will be populated with specific values post-decision.
    - **Landing Page Template:** Develop a generic, decision-agnostic landing page template with placeholders for pricing, call-to-action, and vertical-specific content.

4. Exact Safe-Scope Files BuilderOS Should Touch First
    - `config/marketingOs.js`: New file for MarketingOS-specific configuration.