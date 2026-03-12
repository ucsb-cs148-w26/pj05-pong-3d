import express from 'express';
import {
	createEquippedItemsSql,
	dbAll,
	dbGet,
	dbRun,
	PAINTED_ITEM_KEY_SQL_PATTERN
} from '../db/helpers.js';

export default function createUserRouter() {
	const router = express.Router();

	function ensureAuth(req, res, next) {
		if (req.isAuthenticated && req.isAuthenticated()) return next();
		res.status(401).json({ error: 'Unauthorized' });
	}

	const cosmeticCollectionSql = `
		SELECT i.id, i.item_key, i.kind, i.display_name, u.unlocked_at
		FROM items i
		LEFT JOIN user_unlocks u
		ON i.id = u.item_id AND u.user_id = ?
		WHERE i.kind = ?
		AND (i.item_key NOT LIKE ? OR u.unlocked_at IS NOT NULL)
	`;

	const unlocksSql = `SELECT i.id, i.item_key, i.kind, i.display_name, i.is_default, u.unlocked_at
		FROM items i
		INNER JOIN user_unlocks u ON i.id = u.item_id
		WHERE u.user_id = ? AND i.kind != 'goal_explosion'`;

	const allUnlocksSql = `SELECT i.id, i.item_key, i.kind, i.display_name, i.is_default, u.unlocked_at
		FROM items i
		INNER JOIN user_unlocks u ON i.id = u.item_id
		WHERE u.user_id = ?`;

	router.get('/', ensureAuth, async (req, res) => {
		const userId = req.user.id;

		try {
			const [paddleSkins, goalExplosions, ballSkins, unlocks, equipped] =
				await Promise.all([
					dbAll(cosmeticCollectionSql, [
						userId,
						'paddle_skin',
						PAINTED_ITEM_KEY_SQL_PATTERN
					]),
					dbAll(cosmeticCollectionSql, [
						userId,
						'goal_explosion',
						PAINTED_ITEM_KEY_SQL_PATTERN
					]),
					dbAll(cosmeticCollectionSql, [
						userId,
						'ball_skin',
						PAINTED_ITEM_KEY_SQL_PATTERN
					]),
					dbAll(unlocksSql, [userId]),
					dbGet(createEquippedItemsSql(), [userId])
				]);

			res.render('user', {
				user: req.user,
				unlocks,
				equipped: equipped || {},
				paddleSkins,
				goalExplosions,
				ballSkins
			});
		} catch (err) {
			console.error(err);
			res.status(500).send('Database error');
		}
	});

	router.post('/updateDisplayName', ensureAuth, async (req, res) => {
		const userId = req.user.id;
		const newName = req.body?.display_name?.trim();

		if (!newName) {
			return res
				.status(400)
				.json({ ok: false, message: 'Display name cannot be empty' });
		}

		try {
			await dbRun(`UPDATE users SET display_name = ? WHERE id = ?`, [
				newName,
				userId
			]);
			req.user.display_name = newName;
			res.json({ ok: true, display_name: newName });
		} catch (err) {
			console.error('Failed to update display name:', err.message);
			res.status(500).json({ ok: false, message: 'Database error' });
		}
	});

	router.get('/items/unlocks', ensureAuth, async (req, res) => {
		const userId = req.user.id;
		try {
			const rows = await dbAll(allUnlocksSql, [userId]);
			res.json(rows);
		} catch {
			res.status(500).json({ error: 'Database error' });
		}
	});

	router.get('/items/equipped', ensureAuth, async (req, res) => {
		const userId = req.user.id;
		try {
			const row = await dbGet(createEquippedItemsSql(), [userId]);
			res.json(row || {});
		} catch {
			res.status(500).json({ error: 'Database error' });
		}
	});

	router.post('/items/equipItem', ensureAuth, async (req, res) => {
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

		try {
			await dbRun(sql, [userId, itemId]);
			res.json({ ok: true });
		} catch {
			res.status(500).json({ ok: false, error: 'Database error' });
		}
	});

	router.get('/stats', ensureAuth, async (req, res) => {
		const userId = req.user.id;

		try {
			const player = await dbGet(
				`SELECT id, display_name, elo
				FROM users
				WHERE id = ?`,
				[userId]
			);

			if (!player) {
				return res.status(404).json({ ok: false, error: 'Player not found' });
			}

			const totals = await dbGet(
				`SELECT
					COUNT(*) AS total_games,
					SUM(CASE WHEN winner_user_id = ? THEN 1 ELSE 0 END) AS wins
				FROM match_history
				WHERE winner_user_id = ? OR loser_user_id = ?`,
				[userId, userId, userId]
			);

			const recentMatchesRaw = await dbAll(
				`SELECT
					m.id,
					m.ended_at,
					m.winner_user_id,
					m.loser_user_id,
					m.winner_lives_remaining,
					m.winner_elo_before,
					m.winner_elo_after,
					m.loser_elo_before,
					m.loser_elo_after,
					w.display_name AS winner_display_name,
					l.display_name AS loser_display_name
				FROM match_history m
				LEFT JOIN users w ON w.id = m.winner_user_id
				LEFT JOIN users l ON l.id = m.loser_user_id
				WHERE m.winner_user_id = ? OR m.loser_user_id = ?
				ORDER BY datetime(m.ended_at) DESC
				LIMIT 10`,
				[userId, userId]
			);

			const rankRow = await dbGet(
				`SELECT COUNT(*) + 1 AS rank
				FROM users
				WHERE elo > ?`,
				[player.elo]
			);

			const previous10Games = recentMatchesRaw.map((match) => {
				const myWin = match.winner_user_id === userId;

				const myEloBefore = myWin
					? match.winner_elo_before
					: match.loser_elo_before;
				const myEloAfter = myWin
					? match.winner_elo_after
					: match.loser_elo_after;

				const opponentEloBefore = myWin
					? match.loser_elo_before
					: match.winner_elo_before;
				const opponentEloAfter = myWin
					? match.loser_elo_after
					: match.winner_elo_after;

				return {
					id: match.id,
					ended_at: match.ended_at,
					my_display_name: player.display_name,
					opponent_display_name: myWin
						? match.loser_display_name
						: match.winner_display_name,
					winner_lives_remaining: match.winner_lives_remaining,
					result: myWin ? 'win' : 'loss',
					my_elo_before: myEloBefore,
					my_elo_after: myEloAfter,
					my_elo_change: myEloAfter - myEloBefore,
					opponent_elo_before: opponentEloBefore,
					opponent_elo_after: opponentEloAfter,
					opponent_elo_change: opponentEloAfter - opponentEloBefore
				};
			});

			const chronologicalMatches = [...recentMatchesRaw].reverse();

			const eloHistory =
				chronologicalMatches.length === 0
					? [player.elo]
					: [
							chronologicalMatches[0].winner_user_id === userId
								? chronologicalMatches[0].winner_elo_before
								: chronologicalMatches[0].loser_elo_before,
							...chronologicalMatches.map((match) =>
								match.winner_user_id === userId
									? match.winner_elo_after
									: match.loser_elo_after
							)
						];

			res.json({
				ok: true,
				wins: totals?.wins ?? 0,
				totalGames: totals?.total_games ?? 0,
				previous10Games,
				eloHistory,
				rank: rankRow?.rank ?? null
			});
		} catch (err) {
			console.error('Failed to fetch user stats:', err);
			res.status(500).json({ ok: false, error: 'Database error' });
		}
	});

	return router;
}
