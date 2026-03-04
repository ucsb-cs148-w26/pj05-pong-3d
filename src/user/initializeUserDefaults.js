import db from '../db/db.js';

function runAsync(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve(this);
		});
	});
}

function getAsync(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => {
			if (err) return reject(err);
			resolve(row);
		});
	});
}

export async function initializeUserDefaults(userId) {
	await runAsync('BEGIN');

	try {
		await runAsync(
			`INSERT OR IGNORE INTO user_unlocks (user_id, item_id, unlocked_at)
			 SELECT ?, id, datetime('now')
			 FROM items
			 WHERE is_default = 1`,
			[userId]
		);

		await runAsync(
			`INSERT OR IGNORE INTO user_equipped (user_id) VALUES (?)`,
			[userId]
		);

		const defaults = await getAsync(
			`SELECT
			 MAX(CASE WHEN kind='paddle_skin' THEN id END) AS paddle_skin_id,
			 MAX(CASE WHEN kind='ball_skin' THEN id END) AS ball_skin_id,
			 MAX(CASE WHEN kind='goal_explosion' THEN id END) AS goal_explosion_id
			 FROM items
			 WHERE is_default = 1`
		);

		if (!defaults?.paddle_skin_id || !defaults?.ball_skin_id || !defaults?.goal_explosion_id) {
			throw new Error(
				'Missing default items in items table (one or more kinds has no is_default=1).'
			);
		}

		await runAsync(
			`UPDATE user_equipped
			 SET paddle_skin_item_id = ?,
				 ball_skin_item_id = ?,
				 goal_explosion_item_id = ?,
				 updated_at = datetime('now')
			 WHERE user_id = ?`,
			[
				defaults.paddle_skin_id,
				defaults.ball_skin_id,
				defaults.goal_explosion_id,
				userId
			]
		);

		await runAsync('COMMIT');
	} catch (err) {
		await runAsync('ROLLBACK');
		throw err;
	}
}
