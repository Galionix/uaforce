CREATE TABLE IF NOT EXISTS survival_runs (
 id TEXT PRIMARY KEY, players INTEGER NOT NULL CHECK(players IN (1,2)),
 host_token TEXT NOT NULL, guest_token TEXT NOT NULL,
 started INTEGER NOT NULL, updated INTEGER NOT NULL,
 seconds INTEGER NOT NULL DEFAULT 0, wave INTEGER NOT NULL DEFAULT 0, kills INTEGER NOT NULL DEFAULT 0,
 finished INTEGER NOT NULL DEFAULT 0, qa INTEGER NOT NULL DEFAULT 0,
 name1 TEXT, name2 TEXT
);
CREATE INDEX IF NOT EXISTS survival_ranking ON survival_runs(players,finished,qa,seconds DESC,wave DESC);
CREATE INDEX IF NOT EXISTS survival_expiry ON survival_runs(updated);
