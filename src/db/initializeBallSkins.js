import db from './db.js';
import { BALL_SKIN_STYLES } from '../../public/game/shaders/ballSkin.js';

export function initializeBallSkins() {
	BALL_SKIN_STYLES.forEach((style) => {
		db.get(
			'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
			[style.styleIndex, 'ball_skin'],
			(err, row) => {
				if (err) return console.error(err);

				if (!row) {
					db.run(
						`INSERT INTO items (item_key, kind, display_name, is_default)
                         VALUES (?, 'ball_skin', ?, ?)`,
						//TODO: Set some skins as default
						[style.styleIndex, style.label, 0]
					);
				}
			}
		);
	});
}
