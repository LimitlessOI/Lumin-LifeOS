/**
 * SYNOPSIS: Service module — Dialogue Bundle Skus.
 */
export const getBundleSKUs = () => {
  return [
    {
      id: 'bundle_website_tier',
      name: 'Website Bundle',
      description: 'Includes essential website features.',
      price: 99.00,
      currency: 'USD',
      components: ['website_hosting', 'domain_registration', 'basic_seo']
    },
    {
      id: 'bundle_automation_tier',
      name: 'Automation Bundle',
      description: 'Streamline operations with automation tools.',
      price: 199.00,
      currency: 'USD',
      components: ['email_automation', 'crm_integration', 'workflow_automation']
    },
    {
      id: 'bundle_social_tier',
      name: 'Social Media Bundle',
      description: 'Boost your social media presence.',
      price: 149.00,
      currency: 'USD',
      components: ['social_media_scheduling', 'content_creation_tools', 'analytics_reporting']
    },
    {
      id: 'bundle_premium_tier',
      name: 'Premium Bundle',
      description: 'All-inclusive package for comprehensive digital presence.',
      price: 399.00,
      currency: 'USD',
      components: [
        'website_hosting',
        'domain_registration',
        'advanced_seo',
        'email_automation',
        'crm_integration',
        'workflow_automation',
        'social_media_scheduling',
        'content_creation_tools',
        'analytics_reporting',
        'priority_support'
      ]
    }
  ];
};