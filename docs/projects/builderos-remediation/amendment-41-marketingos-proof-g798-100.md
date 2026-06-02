# Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G798-100

**Source Blueprint:** `docs/projects/AMENDMENT_41_MARKETINGOS.md`
**Signal:** This document — SSOT foundation.

This note addresses the specific implementation and proof gap G798-100, focusing on establishing the Single Source of Truth (SSOT) foundation for MarketingOS as outlined in Amendment 41.

## 1. Exact Missing Implementation or Proof Gap

The current MarketingOS data ingestion pipeline for campaign metadata lacks explicit validation and synchronization logic for the `campaign_segment_id` attribute against the central `CampaignService` SSOT. While `campaign_id` is synchronized, `campaign_segment_id` is currently derived or locally managed, leading to potential inconsistencies with the SSOT. The gap is to ensure `campaign_segment_id` is consistently sourced and validated from the `CampaignService` SSOT during campaign creation and updates within MarketingOS.

## 2. Smallest Safe Build Slice to Close It

Extend the existing `MarketingCampaignSyncService` to fetch and validate `campaign_segment_id` from the `CampaignService`'s `getCampaignDetails` endpoint. This involves adding a new field mapping and validation step within the synchronization process. No new services or major architectural changes are required; it's an extension of an existing data flow.

## 3. Exact Safe-Scope Files to Touch First

*   `services/marketing/MarketingCampaignSyncService.js`: Modify the `syncCampaignData` method to include fetching and validating `campaign_segment_id`.
*