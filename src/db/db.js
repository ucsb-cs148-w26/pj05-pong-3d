import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const dbPath = path.resolve(import.meta.dirname, '..', '..', 'db', 'pong.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error(err.message);
		return;
	}
	console.log('Connected to the pong database.');
});

db.serialize(() => {
	db.run('PRAGMA foreign_keys = ON;');
	db.run('PRAGMA journal_mode = WAL;');

	db.run(
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			google_sub TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL UNIQUE,
			display_name TEXT,
			avatar_url TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		(err) => {
			if (err) console.error('Table creation failed:', err.message);
		}
	);

	db.run(
		`CREATE TABLE IF NOT EXISTS items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			item_key TEXT NOT NULL UNIQUE,
			kind TEXT NOT NULL CHECK (kind IN ('paddle_skin', 'ball_skin', 'goal_explosion')),
			display_name TEXT NOT NULL,
			asset_key TEXT NOT NULL,
			is_default INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		(err) => {
			if (err) console.error('Table creation failed:', err.message);
		}
	);

	db.run(
		`CREATE TABLE IF NOT EXISTS user_unlocks (
			user_id INTEGER NOT NULL,
			item_id INTEGER NOT NULL,
			unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
			PRIMARY KEY (user_id, item_id),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
		)`,
		(err) => {
			if (err) console.error('Table creation failed:', err.message);
		}
	);

	/* This implementation does not enfore the item being a particular type (i.e. a paddle skin could be equipped to a goal explosion slot)
	   This will need to be handled in code
	*/
	db.run(
		`CREATE TABLE IF NOT EXISTS user_equipped (
			user_id INTEGER PRIMARY KEY,
			paddle_skin_item_id INTEGER,
			ball_skin_item_id INTEGER,
			goal_explosion_item_id INTEGER,
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (paddle_skin_item_id) REFERENCES items(id),
			FOREIGN KEY (ball_skin_item_id) REFERENCES items(id),
			FOREIGN KEY (goal_explosion_item_id) REFERENCES items(id)
		)`,
		(err) => {
			if (err) console.error('Table creation failed:', err.message);
		}
	);

	db.run('CREATE INDEX IF NOT EXISTS idx_items_kind ON items(kind);');
	db.run(
		'CREATE INDEX IF NOT EXISTS idx_user_unlocks_user_id ON user_unlocks(user_id);'
	);

	db.run(
		`CREATE TRIGGER IF NOT EXISTS update_users_timestamp
			AFTER UPDATE ON users
			BEGIN
				UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id;
			END;
		`
	);
});

//This intecrepts the node.js process stop command to have it close the connection to the db first
process.on('SIGINT', () => {
	db.close((err) => {
		if (err) console.error(err.message);
		console.log('Closed the database connection.');
		process.exit(0);
	});
});

export default db;
