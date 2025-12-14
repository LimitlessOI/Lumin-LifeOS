```javascript
async function getFunnelData(req, res) {
  // Mock funnel data logic
  const data = { steps: ['Landing', 'Signup', 'Purchase'], conversionRates: [0.5, 0.3] };
  res.json(data);
}

module.exports = { funnelController: { getFunnelData } };
```