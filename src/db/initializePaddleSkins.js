import db from './db.js';
import { PADDLE_STYLE_CONFIGS } from '../../public/game/shaders/paddleSkin.js';

export function initializePaddleSkins() {
	PADDLE_STYLE_CONFIGS.forEach((style) => {
		// TODO: Integer id collides with goal explosion.
		// Added 'paddle_' to ensure no collision, but a better fix must be made.
		const itemKey = `paddle_${style.styleIndex}`;

		db.get(
			'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
			[itemKey, 'paddle_skin'],
			(err, row) => {
				if (err) return console.error(err);

				if (!row) {
					db.run(
						`INSERT INTO items (item_key, kind, display_name, asset_key, is_default)
                         VALUES (?, 'paddle_skin', ?, ?, 0)`,
						[itemKey, style.label, style.styleIndex]
					);
				}
			}
		);
	});
}
