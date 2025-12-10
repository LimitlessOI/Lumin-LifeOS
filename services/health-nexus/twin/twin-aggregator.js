```javascript
function aggregateModelOutputs(wearableOutput, genomicOutput, labOutput) {
  return {
    healthTwin: {
      wearableData: wearableOutput,
      genomicData: genomicOutput,
      labData: labOutput
    }
  };
}

module.exports = { aggregateModelOutputs };
```