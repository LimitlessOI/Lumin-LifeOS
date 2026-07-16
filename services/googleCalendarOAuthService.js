/**
 * SYNOPSIS: services/googleCalendarOAuthService.js
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
// services/googleCalendarOAuthService.js

// Function to initiate the OAuth flow
export function initiateOAuthFlow(clientId, redirectUri, scopes) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  
  // Redirect the user to the Google OAuth page
  return authUrl.toString();
}

// Function to complete the OAuth flow
export async function completeOAuthFlow(clientId, clientSecret, redirectUri, code) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const tokens = await response.json();
  return tokens;
}
