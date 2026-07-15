/**
 * SYNOPSIS: services/credentialVerification.js
 */
// services/credentialVerification.js

// Mock database for demonstration purposes
const credentialsDatabase = {
  user1: "password123",
  user2: "passw0rd",
  user3: "mysecurepassword"
};

// Function to verify credentials
function verifyCredential(username, password) {
  const storedPassword = credentialsDatabase[username];
  if (!storedPassword) {
    return false; // User not found
  }
  return storedPassword === password; // Return true if password matches
}

export { verifyCredential };
