CREATE TABLE IF NOT EXISTS subscriptions (
endpoint TEXT PRIMARY KEY,
payload TEXT NOT NULL,
created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS dispatches (
report_date TEXT PRIMARY KEY,
sent_at TEXT NOT NULL DEFAULT (datetime('now')),
success_count INTEGER NOT NULL DEFAULT 0,
failure_count INTEGER NOT NULL DEFAULT 0
);