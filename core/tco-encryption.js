/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                         TCO ENCRYPTION UTILITIES                                  ║
 * ║               Securely encrypt/decrypt customer API keys                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment or generate one
 * WARNING: In production, MUST set TCO_ENCRYPTION_KEY in environment
 */
function getEncryptionKey() {
  const envKey = process.env.TCO_ENCRYPTION_KEY;

  if (!envKey) {
    console.warn('⚠️ TCO_ENCRYPTION_KEY not set! Using fallback (INSECURE for production)');
    console.warn('   Generate one with: openssl rand -hex 32');
    // Fallback key (INSECURE - only for development)
    return Buffer.from('0'.repeat(64), 'hex');
  }

  // Convert hex string to buffer
  return Buffer.from(envKey, 'hex');
}

/**
 * Encrypt a value (like API key)
 * Returns: base64-encoded string with format: iv:authTag:encryptedData
 */
export function encrypt(plaintext) {
  if (!plaintext) return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // Initialization vector

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a value
 * Takes format: iv:authTag:encryptedData
 */
export function decrypt(encryptedValue) {
  if (!encryptedValue) return null;

  try {
    const key = getEncryptionKey();
    const parts = encryptedValue.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

/**
 * Test encryption/decryption
 */
export function testEncryption() {
  const testKey = 'sk-test-1234567890abcdef';
  const encrypted = encrypt(testKey);
  const decrypted = decrypt(encrypted);

  return {
    success: testKey === decrypted,
    original: testKey,
    encrypted,
    decrypted,
  };
}

export default { encrypt, decrypt, testEncryption };
