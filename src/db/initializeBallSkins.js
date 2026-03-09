import db from './db.js';
import { BALL_SKIN_STYLES } from '../../public/game/shaders/ballSkin.js';

export function initializeBallSkins() {
	BALL_SKIN_STYLES.forEach((style, index) => {
		const isDefault = index === 0 ? 1 : 0;
			db.serialize(() => {
				db.get(
					'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
					[style.styleIndex, 'ball_skin'],
					(err, row) => {
						if (err) return console.error(err);

						if (!row) {
							db.serialize(() => {
								db.run(
									`INSERT INTO items (item_key, kind, display_name, is_default)
									VALUES (?, 'ball_skin', ?, ?)`,
									[style.styleIndex, style.label, isDefault]
								);
							});
						}
					}
				);
			});
		}
	);
}
