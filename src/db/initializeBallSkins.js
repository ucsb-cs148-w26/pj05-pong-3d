import db from './db.js';

// TODO: Replace this with real ball skin configs
const BALL_SKIN_CONFIGS = [
	{ id: 'classic', displayName: 'Classic', assetKey: 'classic', isDefault: 0 },
	{
		id: 'neon_blue',
		displayName: 'Neon Blue',
		assetKey: 'neon_blue',
		isDefault: 0
	},
	{
		id: 'hot_pink',
		displayName: 'Hot Pink',
		assetKey: 'hot_pink',
		isDefault: 0
	}
];

export function initializeBallSkins() {
	BALL_SKIN_CONFIGS.forEach((config) => {
		db.get(
			'SELECT 1 FROM items WHERE item_key = ? AND kind = ?',
			[config.id, 'ball_skin'],
			(err, row) => {
				if (err) return console.error(err);

				if (!row) {
					db.run(
						`INSERT INTO items (item_key, kind, display_name, asset_key, is_default)
                         VALUES (?, 'ball_skin', ?, ?, ?)`,
						[config.id, config.displayName, config.assetKey, config.isDefault]
					);
				}
			}
		);
	});
}
