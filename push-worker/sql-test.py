import sqlite3
from pathlib import Path
conn=sqlite3.connect(':memory:')
conn.executescript(Path('schema.sql').read_text())
conn.executescript(Path('migrations/0002_free_plan_capacity.sql').read_text())
for i in range(20):
    conn.execute('INSERT INTO subscriptions(endpoint,payload) VALUES (?,?)',(str(i),'{}'))
conn.execute("INSERT INTO subscriptions(endpoint,payload) VALUES ('0','updated') ON CONFLICT(endpoint) DO UPDATE SET payload=excluded.payload")
try:
    conn.execute("INSERT INTO subscriptions(endpoint,payload) VALUES ('21','{}')")
    raise AssertionError('capacity was not enforced')
except sqlite3.IntegrityError as exc:
    assert str(exc)=='subscription capacity reached'
conn.execute("INSERT OR IGNORE INTO dispatches(report_date) VALUES ('2026-10-08')")
assert conn.execute("INSERT OR IGNORE INTO dispatches(report_date) VALUES ('2026-10-08')").rowcount==0
print('PASS: actual SQLite migrations, atomic capacity, upsert at capacity, unique dispatch constraint.')
