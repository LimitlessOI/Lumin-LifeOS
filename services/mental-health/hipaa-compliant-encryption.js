```javascript
const CryptoJS = require('crypto-js');

class EncryptionService {
  encrypt(data, key) {
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  decrypt(ciphertext, key) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

module.exports = new EncryptionService();
```