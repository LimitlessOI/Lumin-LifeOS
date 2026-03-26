/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-workflow-specs.js
 * Machine-readable listing and buyer workflow specs derived from the current TC operating templates.
 */

export const TC_WORKFLOW_SPECS = {
  listing: {
    key: 'listing',
    label: 'Listing Workflow',
    stages: [
      {
        key: 'intake',
        label: 'Listing Intake',
        tasks: [
          { key: 'create_dropbox_folder', label: 'Create Dropbox folder', completeOn: ['dropbox_synced'] },
          { key: 'send_paperwork_for_signing', label: 'Send paperwork for signing', completeOn: ['paperwork_sent_for_signing'] },
          { key: 'open_transaction_in_skyslope', label: 'Open transaction in SkySlope', completeOn: ['td_created'] },
          { key: 'upload_fe_listing_agreement', label: 'Upload fully executed listing agreement', completeOn: ['doc_uploaded'], docHints: ['listing agreement'] },
          { key: 'welcome_listing_agreement', label: 'Welcome / listing agreement enclosed', completeOn: ['welcome_sent', 'client_update_sent'] },
          { key: 'order_prelim_title', label: 'Order preliminary title report', completeOn: ['title_ordered'] },
          { key: 'verify_client_contact', label: 'Verify client contact information in CRM', completeOn: ['boldtrail_synced'] },
        ],
      },
      {
        key: 'listing_prep',
        label: 'Listing Prep',
        tasks: [
          { key: 'documents_needed_dropbox', label: 'Request missing docs for Dropbox', completeOn: ['document_request_sent', 'document_request_updated'] },
          { key: 'documents_needed_skyslope', label: 'Request missing docs for SkySlope', completeOn: ['document_request_sent', 'document_request_updated'] },
          { key: 'add_photos_mls', label: 'Add photos to MLS listing', completeOn: ['mls_assets_uploaded'] },
          { key: 'send_aer_mls_for_approval', label: 'Send A-ER MLS listing for seller approval', completeOn: ['approval_request_sent'] },
        ],
      },
      {
        key: 'live_listing',
        label: 'Upon Seller Approval',
        tasks: [
          { key: 'assign_lockbox', label: 'Assign lockbox and activate in inventory', completeOn: ['lockbox_assigned'] },
          { key: 'set_up_showingtime', label: 'Set up showing system', completeOn: ['showingtime_synced'] },
          { key: 'activate_listing', label: 'Activate listing', completeOn: ['listing_activated'] },
          { key: 'confirm_syndication', label: 'Confirm listing syndication', completeOn: ['listing_syndicated'] },
          { key: 'weekly_seller_updates', label: 'Maintain weekly seller updates', recurring: true, completeOn: ['seller_update_sent', 'weekly_report_generated'] },
        ],
      },
    ],
  },
  buyers: {
    key: 'buyers',
    label: 'Buyer Workflow',
    stages: [
      {
        key: 'contract_intake',
        label: 'Buyer Contract Intake',
        tasks: [
          { key: 'open_transaction_in_skyslope', label: 'Open transaction in SkySlope', completeOn: ['td_created'] },
          { key: 'upload_executed_rpa', label: 'Upload executed purchase agreement', completeOn: ['doc_uploaded'], docHints: ['purchase agreement', 'rpa'] },
          { key: 'send_party_intro', label: 'Send party intro / welcome', completeOn: ['party_intro_sent'] },
          { key: 'confirm_emd', label: 'Confirm earnest money / deposit instructions', completeOn: ['emd_confirmed'] },
          { key: 'order_home_inspection', label: 'Coordinate home inspection', completeOn: ['inspection_scheduled'] },
        ],
      },
      {
        key: 'active_escrow',
        label: 'Buyer Active Escrow',
        tasks: [
          { key: 'track_contingencies', label: 'Track contingency deadlines', completeOn: ['deadline_reminder_sent'], recurring: true },
          { key: 'request_missing_disclosures', label: 'Request missing disclosures', completeOn: ['document_request_sent', 'document_request_updated'] },
          { key: 'coordinate_lender_title', label: 'Coordinate lender / escrow / title status', completeOn: ['lender_synced', 'title_synced'] },
          { key: 'weekly_buyer_updates', label: 'Maintain weekly buyer updates', recurring: true, completeOn: ['client_update_sent'] },
        ],
      },
      {
        key: 'closing_prep',
        label: 'Closing Prep',
        tasks: [
          { key: 'final_walkthrough', label: 'Coordinate final walkthrough', completeOn: ['final_walkthrough_scheduled'] },
          { key: 'close_of_escrow_package', label: 'Prepare close of escrow package', completeOn: ['closing_package_prepared'] },
          { key: 'confirm_keys_and_funding', label: 'Confirm funding and key handoff', completeOn: ['funding_confirmed', 'keys_confirmed'] },
        ],
      },
    ],
  },
};

export function getTCWorkflowSpec(agentRole = 'buyers') {
  return TC_WORKFLOW_SPECS[String(agentRole || 'buyers').toLowerCase()] || TC_WORKFLOW_SPECS.buyers;
}

export default getTCWorkflowSpec;
