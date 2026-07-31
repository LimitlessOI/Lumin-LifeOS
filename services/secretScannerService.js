/**
 * SYNOPSIS: Exports scanSecrets — services/secretScannerService.js.
 */
const secretPatterns = [
  /sk-[a-zA-Z0-9]{32,}/g, // OpenAI API keys
  /RCS_[a-zA-Z0-9]{32,}/g, // Google AI Studio API keys (example pattern)
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub Personal Access Tokens
  /xoxb-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/g, // Slack Bot Tokens
  /EAACEdEose0cBA[0-9A-Za-z]{113}/g, // Facebook Access Tokens
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID
  /[0-9a-zA-Z/+]{40}K/g, // AWS Secret Access Key (example pattern, often base64 encoded)
  /^[A-Za-z0-9-_]{20,200}\.[A-Za-z0-9-_]{20,200}\.[A-Za-z0-9-_]{20,200}$/g, // JWTs
  /-----BEGIN (RSA|EC|PGP) PRIVATE KEY-----[\s\S]*?-----END (RSA|EC|PGP) PRIVATE KEY-----/g, // Private Keys
  /pk_live_[0-9a-zA-Z]{32}/g, // Stripe Live Publishable Key
  /rk_live_[0-9a-zA-Z]{32}/g, // Stripe Live Restricted Key
  /sq0csp-[0-9A-Za-z\-_]{43}/g, // Square Connect API Sandbox Access Token
  /sq0actp-[0-9A-Za-z\-_]{43}/g, // Square Connect API Production Access Token
  /sq0idp-[0-9A-Za-z\-_]{43}/g, // Square Connect API Sandbox ID
  /sq0idp-[0-9A-Za-z\-_]{43}/g, // Square Connect API Production ID
  /s3\.amazonaws\.com/g, // S3 bucket URLs (potential data exposure)
  /mongodb(?:\+srv)?:\/\/(?:[a-zA-Z0-9-._~%]+(?::[a-zA-Z0-9-._~%]+)?@)?(?:[a-zA-Z0-9-.]+(?::\d+)?(?:,[a-zA-Z0-9-.]+(?::\d+)?)*)(?:\/[a-zA-Z0-9-._~%]+)?(?:\?[a-zA-Z0-9-._~%]+=.*)?/g, // MongoDB connection strings
  /mysql:\/\/(?:[a-zA-Z0-9-._~%]+(?::[a-zA-Z0-9-._~%]+)?@)?(?:[a-zA-Z0-9-.]+(?::\d+)?)(?:\/[a-zA-Z0-9-._~%]+)?(?:\?[a-zA-Z0-9-._~%]+=.*)?/g, // MySQL connection strings
  /postgres(?:ql)?:\/\/(?:[a-zA-Z0-9-._~%]+(?::[a-zA-Z0-9-._~%]+)?@)?(?:[a-zA-Z0-9-.]+(?::\d+)?)(?:\/[a-zA-Z0-9-._~%]+)?(?:\?[a-zA-Z0-9-._~%]+=.*)?/g, // PostgreSQL connection strings
  /redis:\/\/(?:[a-zA-Z0-9-._~%]+(?::[a-zA-Z0-9-._~%]+)?@)?(?:[a-zA-Z0-9-.]+(?::\d+)?)(?:\/[a-zA-Z0-9-._~%]+)?(?:\?[a-zA-Z0-9-._~%]+=.*)?/g, // Redis connection strings
];

const placeholderPatterns = [
  /YOUR_OPENAI_API_KEY/,
  /YOUR_GOOGLE_AI_STUDIO_API_KEY/,
  /YOUR_GITHUB_TOKEN/,
  /YOUR_SLACK_BOT_TOKEN/,
  /YOUR_FACEBOOK_ACCESS_TOKEN/,
  /YOUR_AWS_ACCESS_KEY_ID/,
  /YOUR_AWS_SECRET_ACCESS_KEY/,
  /YOUR_JWT_TOKEN/,
  /YOUR_PRIVATE_KEY/,
  /YOUR_STRIPE_LIVE_PUBLISHABLE_KEY/,
  /YOUR_STRIPE_LIVE_RESTRICTED_KEY/,
  /YOUR_SQUARE_CONNECT_API_SANDBOX_ACCESS_TOKEN/,
  /YOUR_SQUARE_CONNECT_API_PRODUCTION_ACCESS_TOKEN/,
  /YOUR_SQUARE_CONNECT_API_SANDBOX_ID/,
  /YOUR_SQUARE_CONNECT_API_PRODUCTION_ID/,
  /YOUR_S3_BUCKET_URL/,
  /YOUR_MONGODB_CONNECTION_STRING/,
  /YOUR_MYSQL_CONNECTION_STRING/,
  /YOUR_POSTGRESQL_CONNECTION_STRING/,
  /YOUR_REDIS_CONNECTION_STRING/,
  /\{[A-Z_]+\}/, // Generic placeholders like {API_KEY}
  /\$[A-Z_]+/ // Generic placeholders like $API_KEY
];

function isFalsePositive(match, line) {
  for (const placeholderPattern of placeholderPatterns) {
    if (placeholderPattern.test(line)) {
      return true;
    }
  }
  return false;
}

export function scanSecrets(fileContent) {
  const findings = [];
  const lines = fileContent.split('\n');

  lines.forEach((line, lineNumber) => {
    for (const pattern of secretPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (!isFalsePositive(match[0], line)) {
          findings.push({
            lineNumber: lineNumber + 1,
            match: match[0],
            pattern: pattern.source,
            context: line.trim()
          });
        }
      }
    }
  });
  return findings;
}