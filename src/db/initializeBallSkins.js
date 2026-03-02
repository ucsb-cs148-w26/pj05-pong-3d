import db from './db.js';

// TODO: Replace this with real ball skin configs
const BALL_SKIN_CONFIGS = [
	{ id: '0', displayName: 'Classic', isDefault: 0 },
	{
		id: '1',
		displayName: 'Neon Blue',
		isDefault: 0
	},
	{
		id: '2',
		displayName: 'Hot Pink',
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
						`INSERT INTO items (item_key, kind, display_name, is_default)
                         VALUES (?, 'ball_skin', ?, ?)`,
						[config.id, config.displayName, config.isDefault]
					);
				}
			}
		);
	});
}
