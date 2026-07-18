<!-- SYNOPSIS: Migration Runbook: Amendment 02 -->

# Migration Runbook: Amendment 02

## Objective
This document outlines the steps required to perform the migration of `conversation_memory` data to the new system.

## Recency Threshold Clarification
The recency threshold determines which conversation memories are eligible for migration based on their last interaction date. It is crucial to ensure that only relevant and recent data is migrated to maintain system efficiency and relevance.

### Confirmed Recency Threshold
The confirmed recency threshold for migrating conversation memory is set to **90 days**. This means that only conversation memories with a last interaction date within the past 90 days from the migration date will be included in the migration process.

## Migration Steps

### Pre-Migration Checklist
1. **Backup Data**: Ensure that all existing conversation memory data is backed up.
2. **System Preparation**: Verify that the new system is fully operational and ready to receive data.

### Migration Execution
1. **Identify Eligible Data**: Query the current database for conversation memories with a last interaction date within the past 90 days.
2. **Data Transfer**: Carefully transfer the identified data to the new system, ensuring data integrity throughout the process.
3. **Verification**: After data transfer, verify that all eligible conversation memories have been accurately migrated.

### Post-Migration
1. **Validation**: Conduct thorough testing to ensure that the new system is functioning correctly with the migrated data.
2. **Monitoring**: Implement monitoring to track performance and address any post-migration issues.

## Recency Threshold Review
- **Review Frequency**: The recency threshold should be reviewed annually to ensure it aligns with business needs and system capabilities.
- **Adjustment Process**: Any adjustments to the recency threshold must be documented and communicated to all relevant stakeholders.

## Conclusion
Adhering to the confirmed recency threshold and following the outlined steps will ensure a smooth and efficient migration of conversation memory data.