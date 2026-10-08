CREATE TRIGGER IF NOT EXISTS subscription_limit
BEFORE INSERT ON subscriptions
WHEN NOT EXISTS(SELECT 1 FROM subscriptions WHERE endpoint=NEW.endpoint)
 AND (SELECT count(*) FROM subscriptions)>=20
BEGIN SELECT RAISE(ABORT, 'subscription capacity reached'); END;
