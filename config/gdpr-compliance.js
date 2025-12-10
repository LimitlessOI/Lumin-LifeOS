```javascript
module.exports = {
    dataRetentionPeriod: 365, // days
    anonymizeDataAfter: 30, // days
    ensureUserConsent: true,
    accessRequestProcedure: {
        email: 'privacy@company.com',
        responseTime: '30 days'
    },
    dataProtectionOfficer: {
        name: 'John Doe',
        contact: 'dpo@company.com'
    }
};
```