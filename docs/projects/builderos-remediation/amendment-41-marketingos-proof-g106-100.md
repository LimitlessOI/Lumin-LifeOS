<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G106 100. -->

const fs = require('fs');
const path = require('path');
const { validate } = require('jsonschema');

const marketingCampaignSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "description": {"type": "string"}
  },
  "required": ["id", "name", "description"]
};

const validateMarketingCampaign = (data) => {
  try {
    const result = validate(data, marketingCampaignSchema);
    if (!result.valid) {
      throw new Error(result.errors[0].message);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const validateMarketingCampaigns = (data) => {
  data.forEach(validateMarketingCampaign);
};

const marketingCampaigns = [
  {
    "id": "MC-001",
    "name": "Campaign 1",
    "description": "This is campaign 1"
  },
  {
    "id": "MC-002",
    "name": "Campaign 2",
    "description": "This is campaign 2"
  }
];

validateMarketingCampaigns(marketingCampaigns);