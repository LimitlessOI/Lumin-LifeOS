-- Founder Interface role hardening
-- Ensure Adam is founder_admin for account-authenticated Founder Interface access.

UPDATE lifeos_users
SET role = 'founder_admin'
WHERE LOWER(user_handle) = 'adam';
