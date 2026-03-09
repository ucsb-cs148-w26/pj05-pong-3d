import db from './db.js';
import { PADDLE_STYLE_CATALOG } from '../../public/game/shaders/paddleSkin.js';

export function initializePaddleSkins() {
	PADDLE_STYLE_CATALOG.forEach((style, index) => {
		const isDefault = index === 0 ? 1 : 0;
		db.serialize(() => {
			db.get(
				'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
				[style.styleIndex, 'paddle_skin'],
				(err, row) => {
					if (err) return console.error(err);
					db.serialize(() => {
						if (!row) {
							db.run(
								`INSERT INTO items (item_key, kind, display_name, is_default)
							VALUES (?, 'paddle_skin', ?, ?)`,
								[style.styleIndex, style.label, isDefault]
							);
						}
					});
				}
			);
		});
	});
}
