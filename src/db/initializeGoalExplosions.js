import db from './db.js';
import { GOAL_EXPLOSION_STYLES } from '../../public/game/shaders/goalAnimations.js';

export function initializeGoalExplosions() {
	GOAL_EXPLOSION_STYLES.forEach((style, index) => {
		const isDefault = index === 0 ? 1 : 0;
		db.serialize(() => {
			db.get(
				'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
				[style.styleIndex, 'goal_explosion'],
				(err, row) => {
					if (err) return console.error(err);

					if (!row) {
						db.serialize(() => {
							db.run(
								`INSERT INTO items (item_key, kind, display_name, is_default)
								VALUES (?, 'goal_explosion', ?, ?)`,
								[style.styleIndex, style.label, isDefault]
							);
						});
					}
				}
			);
		});
	});
}
