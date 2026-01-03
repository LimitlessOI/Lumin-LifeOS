// Set your secret key in environment variables, not embedded directly into code for security reasons
import { loadStripe } from '@stripe/stripe-js';
const stripe = await loadStripe('your_secret_key'); // replace 'your_secret_key' with the actual Stripe secret key provided by your dashboard or API keys. Never hardcode secrets into codebase for security reasons, use environment variables instead.