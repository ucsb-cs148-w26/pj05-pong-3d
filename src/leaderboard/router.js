import express from 'express';
import db from '../db/db.js';

export default function createLeaderboardRouter() {
	const router = express.Router();

	const dbAll = (sql, params = []) =>
		new Promise((resolve, reject) => {
			db.all(sql, params, (err, rows) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});

	router.get('/', async (req, res) => {
		try {
			const leaderboard = await dbAll(
				`SELECT
					u.id,
					COALESCE(u.display_name, u.email) AS display_name,
					u.avatar_url,
					u.elo,
					COALESCE(stats.wins, 0) AS wins,
					COALESCE(stats.total_games, 0) AS total_games
				FROM users u
				LEFT JOIN (
					SELECT
						player_id AS user_id,
						COUNT(*) AS total_games,
						SUM(is_win) AS wins
					FROM (
						SELECT winner_user_id AS player_id, 1 AS is_win
						FROM match_history
						UNION ALL
						SELECT loser_user_id AS player_id, 0 AS is_win
						FROM match_history
					)
					GROUP BY player_id
				) stats ON stats.user_id = u.id
				ORDER BY
					u.elo DESC,
					wins DESC,
					total_games DESC,
					display_name COLLATE NOCASE ASC`
			);

			const players = leaderboard.map((player, index) => {
				const wins = Number(player.wins ?? 0);
				const totalGames = Number(player.total_games ?? 0);
				const winRate =
					totalGames > 0
						? Math.round((wins / totalGames) * 1000) / 10
						: 0;

				return {
					id: player.id,
					rank: index + 1,
					displayName: player.display_name,
					avatarUrl: player.avatar_url,
					elo: Number(player.elo ?? 1000),
					wins,
					totalGames,
					record: `${wins}/${totalGames}`,
					winRate,
					isCurrentUser: req.user?.id === player.id
				};
			});

			res.render('leaderboard', {
				players
			});
		} catch (err) {
			console.error('Failed to load leaderboard:', err);
			res.status(500).send('Database error');
		}
	});

	return router;
}
