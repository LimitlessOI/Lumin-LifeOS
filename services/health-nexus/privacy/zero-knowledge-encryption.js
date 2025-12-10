```javascript
const crypto = require('crypto');

function encryptData(data, key) {
  const cipher = crypto.createCipher('aes256', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptData(encrypted, key) {
  const decipher = crypto.createDecipher('aes256', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encryptData, decryptData };
```