/**
 * SYNOPSIS: Upserts a free-tier record.
 */
// services/freeTier.js

let freeTierRecords = [];

/**
 * Upserts a free-tier record.
 * If the record exists, it updates it; if not, it inserts a new record.
 * @param {Object} record - The free-tier record to upsert.
 * @param {string} record.id - The unique identifier for the record.
 * @param {any} record.data - The data associated with the record.
 */
export function upsertFreeTier(record) {
  const index = freeTierRecords.findIndex((r) => r.id === record.id);
  if (index !== -1) {
    freeTierRecords[index] = record; // Update existing record
  } else {
    freeTierRecords.push(record); // Insert new record
  }
}

export { freeTierRecords };
