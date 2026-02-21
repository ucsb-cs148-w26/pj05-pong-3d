import db from './db.js';
import { GOAL_EXPLOSION_STYLES } from '../../public/game/shaders/animationConfigRegistry.js';

export function initializeGoalExplosions() {
	GOAL_EXPLOSION_STYLES.forEach((style) => {
		db.get(
			'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
			[style.id, 'goal_explosion'],
			(err, row) => {
				if (err) return console.error(err);

				if (!row) {
					db.run(
						`INSERT INTO items (item_key, kind, display_name, asset_key, is_default)
                         VALUES (?, 'goal_explosion', ?, ?, 0)`,
						[style.id, style.label, style.id]
					);
				}
			}
		);
	});
}
