/**
 * SYNOPSIS: Service module — EnvRegistryService.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
const rotationMetadata = new Map();

function handleRotationMetadata(environmentId, metadata) {
  if (!rotationMetadata.has(environmentId)) {
    rotationMetadata.set(environmentId, []);
  }
  rotationMetadata.get(environmentId).push(metadata);
}

function getRotationMetadata(environmentId) {
  return rotationMetadata.get(environmentId) || [];
}

const cryptoTiers = new Map();

function setCryptoTier(environmentId, tierLabel) {
  cryptoTiers.set(environmentId, tierLabel);
}

function getCryptoTier(environmentId) {
  return cryptoTiers.get(environmentId);
}

function getEnvRegistryMetadata(environmentId) {
  return {
    rotationMetadata: getRotationMetadata(environmentId),
    cryptoTier: getCryptoTier(environmentId)
  };
}

export { handleRotationMetadata, getRotationMetadata, setCryptoTier, getCryptoTier, getEnvRegistryMetadata };
