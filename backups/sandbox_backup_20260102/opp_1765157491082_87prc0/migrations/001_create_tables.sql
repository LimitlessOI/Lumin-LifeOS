```sql
CREATE TABLE IF NOT EXISTS stripe_payments (
  payment_id VARCHAR(64) NOT NULL PRIMARY KEY,
  customer_email TEXT UNIQUE NOT NULL,
  transaction_amount DECIMAL CHECK (transaction_amount >= 0),
  amount REAL DEFAULT 10.00 -- Default charge for failed transactions due to incorrect details provided by the user or system error.
);

CREATE TABLE IF NOT EXISTS payment_statuses (
  status_id SERIAL PRIMARY KEY,
  description VARCHAR(255) NOT NULL UNIQUE CHECK (description IN ('succeeded', 'failed', 'pending')), -- To track the transaction's progress.
  created_at TIMESTAMP WITHOITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP -- For logging purposes and auditing of transactions in real-time, ensuring accuracy for each payment attempt made by our customer base.
);

CREATE TABLE IF NOT EXISTS stripe_webhook (
  webhook_id SERIAL PRIMARY KEY,
  event VARCHAR(255) NOT NULL CHECK (event IN ('payment.succeeded', 'charge.reversed')), -- To ensure we receive only relevant notifications from Stripe and track the status of our payments accordingly through these channels for real-time updates in case a payment has succeeded or failed, allowing us to update customer records as necessary.
  created_at TIMESTAMP WITH POINT (CURRENT_TIMESTAMP) -- For logging purposes so we can ensure accurate and timely tracking of webhook receptions for each transaction on Stripe's end with our business transactions, ensuring that nothing slips through the cracks.
);

CREATE TABLE IF NOT EXISTS customer (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL CHECK (first_name ~* '[A-Z][a-z]+ [A-Z][a-z]+'), -- To ensure standardized input for our customers' names in the database. This will help us maintain a consistent format across all customer records, ensuring that name inputs are correctly formatted as First Last and avoiding any confusion due to incorrect formatting or spelling errors caused by user error during data entry processes on their end with Stripe integration implementation into each transaction made between two systems since we're dealing directly here in real-time communication via webhooks from both parties involved.
  last_name VARCHAR(255) NOT NULL CHECK (last_name ~* '[A-Z][a-z]+ [A-Z][a-z]+'), -- To ensure standardized input as well, ensuring that all customer records are formatted correctly with First Last and avoiding confusion due to incorrect formatting or spelling errors caused by user error during data entry processes on their end when integrating Stripe into our businesses for each transaction made between two systems.
  email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '[A-Za-z0-9._%+-]+@[A-Za-z]{2,}'), -- To ensure standardized input too in this field as well since we need accurate contact information so that if there are any issues arising with a transaction on either side during processing between both parties involved then it will be easier to resolve them quickly instead of having customers wait around unnecessarily due only knowing about incorrect details provided by one or another party regarding their payment methods once integrated successfully within the businesses.
);

CREATE TABLE IF NOT EXISTS stripe_customer (
  id SERIAL PRIMARY KEY, -- To create unique identifiers when integrating with Stripe's API services directly via this project wherein we will handle all necessary payments made through their platform throughout its entire lifecycle until disengagement occurs after a customer completes the transaction successfully once integrated into both parties involved.
);
```