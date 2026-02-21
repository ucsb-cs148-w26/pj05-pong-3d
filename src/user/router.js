import express from 'express';
import db from '../db/db.js';

export default function createUserRouter() {
	const router = express.Router();

	function ensureAuth(req, res, next) {
		if (req.isAuthenticated && req.isAuthenticated()) return next();
		res.status(401).json({ error: 'Unauthorized' });
	}

	router.get('/', ensureAuth, async (req, res) => {
		const userId = req.user.id;

		const dbAll = (sql, params = []) =>
			new Promise((resolve, reject) => {
				db.all(sql, params, (err, rows) => {
					if (err) reject(err);
					else resolve(rows);
				});
			});

		const dbGet = (sql, params = []) =>
			new Promise((resolve, reject) => {
				db.get(sql, params, (err, row) => {
					if (err) reject(err);
					else resolve(row);
				});
			});

		try {
			const goalExplosions = await dbAll(
				`SELECT i.id, i.item_key, i.kind, i.display_name, i.asset_key, u.unlocked_at
				FROM items i
				LEFT JOIN user_unlocks u 
				ON i.id = u.item_id AND u.user_id = ?
				WHERE i.kind = 'goal_explosion'`,
				[userId]
			);

			const ballSkins = await dbAll(
				`SELECT i.id, i.item_key, i.kind, i.display_name, i.asset_key, u.unlocked_at
				FROM items i
				LEFT JOIN user_unlocks u
				ON i.id = u.item_id AND u.user_id = ?
				WHERE i.kind = 'ball_skin'`,
				[userId]
			);

			const unlocks = await dbAll(
				`SELECT i.id, i.item_key, i.kind, i.display_name, i.asset_key, i.is_default, u.unlocked_at
				FROM items i
				INNER JOIN user_unlocks u ON i.id = u.item_id
				WHERE u.user_id = ? AND i.kind != 'goal_explosion'`,
				[userId]
			);

			const equipped = await dbGet(
				`SELECT
					u.user_id,
					p.id AS paddle_skin_id, p.item_key AS paddle_skin_key, p.display_name AS paddle_skin_name,
					b.id AS ball_skin_id, b.item_key AS ball_skin_key, b.display_name AS ball_skin_name,
					g.id AS goal_explosion_id, g.item_key AS goal_explosion_key, g.display_name AS goal_explosion_name,
					u.updated_at
				FROM user_equipped u
				LEFT JOIN items p ON u.paddle_skin_item_id = p.id
				LEFT JOIN items b ON u.ball_skin_item_id = b.id
				LEFT JOIN items g ON u.goal_explosion_item_id = g.id
				WHERE u.user_id = ?`,
				[userId]
			);

			res.render('user', {
				user: req.user,
				unlocks,
				equipped: equipped || {},
				goalExplosions,
				ballSkins
			});
		} catch (err) {
			console.error(err);
			res.status(500).send('Database error');
		}
	});

	router.post('/updateDisplayName', ensureAuth, (req, res) => {
		const userId = req.user.id;
		const newName = req.body?.display_name?.trim();

		if (!newName) {
			return res
				.status(400)
				.json({ ok: false, message: 'Display name cannot be empty' });
		}

		db.run(
			`UPDATE users SET display_name = ? WHERE id = ?`,
			[newName, userId],
			function (err) {
				if (err) {
					console.error('Failed to update display name:', err.message);
					return res.status(500).json({ ok: false, message: 'Database error' });
				}
				req.user.display_name = newName;
				res.json({ ok: true, display_name: newName });
			}
		);
	});

	router.get('/items/unlocks', ensureAuth, (req, res) => {
		const userId = req.user.id;
		const sql = `SELECT i.id, i.item_key, i.kind, i.display_name, i.asset_key, i.is_default, u.unlocked_at
        FROM items i
        INNER JOIN user_unlocks u ON i.id = u.item_id
        WHERE u.user_id = ?`;
		db.all(sql, [userId], (err, rows) => {
			if (err) return res.status(500).json({ error: 'Database error' });
			res.json(rows);
		});
	});

	router.get('/items/equipped', ensureAuth, (req, res) => {
		const userId = req.user.id;
		const sql = `SELECT
			u.user_id,
			p.id AS paddle_skin_id, p.item_key AS paddle_skin_key, p.display_name AS paddle_skin_name,
			b.id AS ball_skin_id, b.item_key AS ball_skin_key, b.display_name AS ball_skin_name,
			g.id AS goal_explosion_id, g.item_key AS goal_explosion_key, g.display_name AS goal_explosion_name,
			u.updated_at
		FROM user_equipped u
		LEFT JOIN items p ON u.paddle_skin_item_id = p.id
		LEFT JOIN items b ON u.ball_skin_item_id = b.id
		LEFT JOIN items g ON u.goal_explosion_item_id = g.id
		WHERE u.user_id = ?`;
		db.get(sql, [userId], (err, row) => {
			if (err) return res.status(500).json({ error: 'Database error' });
			res.json(row || {});
		});
	});

	router.post('/items/equipItem', ensureAuth, (req, res) => {
		const userId = req.user.id;
		const { itemId, slot } = req.body;

		const validType = ['paddle_skin', 'ball_skin', 'goal_explosion'];
		if (!validType.includes(slot)) {
			return res.status(400).json({ ok: false, error: 'Invalid type' });
		}

		const columnMap = {
			paddle_skin: 'paddle_skin_item_id',
			ball_skin: 'ball_skin_item_id',
			goal_explosion: 'goal_explosion_item_id'
		};
		const column = columnMap[slot];

		const sql = `
			INSERT INTO user_equipped (user_id, ${column})
			VALUES (?, ?)
			ON CONFLICT(user_id) DO UPDATE SET
				${column} = excluded.${column},
				updated_at = datetime('now')
		`;

		db.run(sql, [userId, itemId], function (err) {
			if (err)
				return res.status(500).json({ ok: false, error: 'Database error' });
			res.json({ ok: true });
		});
	});

	router.post('/debug/unlockRandomGoalExplosion', ensureAuth, (req, res) => {
		const userId = req.user.id;

		db.get(
			`SELECT i.id FROM items i
            WHERE i.kind = 'goal_explosion'
            AND i.id NOT IN (
                SELECT item_id FROM user_unlocks WHERE user_id = ?
            )
            ORDER BY RANDOM() LIMIT 1`,
			[userId],
			(err, row) => {
				if (err) return res.status(500).json({ error: 'Database error' });
				if (!row)
					return res.json({ message: 'All goal explosions already unlocked!' });

				db.run(
					`INSERT INTO user_unlocks (user_id, item_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
					[userId, row.id],
					(err2) => {
						if (err2) return res.status(500).json({ error: 'Database error' });
						res.json({
							message: 'Unlocked a new goal explosion!',
							itemId: row.id
						});
					}
				);
			}
		);
	});

	router.post('/debug/unlockRandomBallSkin', ensureAuth, (req, res) => {
		const userId = req.user.id;

		db.get(
			`SELECT i.id FROM items i
            WHERE i.kind = 'ball_skin'
            AND i.id NOT IN (
                SELECT item_id FROM user_unlocks WHERE user_id = ?
            )
            ORDER BY RANDOM() LIMIT 1`,
			[userId],
			(err, row) => {
				if (err) return res.status(500).json({ error: 'Database error' });
				if (!row)
					return res.json({ message: 'All ball skins already unlocked!' });

				db.run(
					`INSERT INTO user_unlocks (user_id, item_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
					[userId, row.id],
					(err2) => {
						if (err2) return res.status(500).json({ error: 'Database error' });
						res.json({ message: 'Unlocked a new ball skin!', itemId: row.id });
					}
				);
			}
		);
	});

	return router;
}
