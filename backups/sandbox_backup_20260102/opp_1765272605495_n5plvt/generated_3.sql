---FILE:migrations/003_create_stripe_integration.sql---
INSERT INTO stripe_integrations (name, status, created_at) VALUES ('Stripe Integration', 'active', NOW());
CREATE TRIGGER payment_confirmation AFTER INSERT ON payments FOR EACH ROW EXECUTE PROCEDURE send_payment_notification();
---END FILE===