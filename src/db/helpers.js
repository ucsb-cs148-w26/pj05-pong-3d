import db from './db.js';
import {
	PAINT_VARIANTS,
	buildPaintedDisplayName,
	createCosmeticItemKey
} from '../../public/game/cosmetics.js';

export const PAINTED_ITEM_KEY_SQL_PATTERN = '%:%';

export function dbAll(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.all(sql, params, (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
}

export function dbGet(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => {
			if (err) reject(err);
			else resolve(row ?? null);
		});
	});
}

export function dbRun(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) reject(err);
			else resolve(this);
		});
	});
}

export async function withTransaction(work) {
	await dbRun('BEGIN TRANSACTION');

	try {
		const result = await work();
		await dbRun('COMMIT');
		return result;
	} catch (error) {
		try {
			await dbRun('ROLLBACK');
		} catch {}

		throw error;
	}
}

export function createEquippedItemsSql(whereClause = 'u.user_id = ?') {
	return `SELECT
		u.user_id,
		p.id AS paddle_skin_id, p.item_key AS paddle_skin_key, p.display_name AS paddle_skin_name,
		b.id AS ball_skin_id, b.item_key AS ball_skin_key, b.display_name AS ball_skin_name,
		g.id AS goal_explosion_id, g.item_key AS goal_explosion_key, g.display_name AS goal_explosion_name,
		u.updated_at
	FROM user_equipped u
	LEFT JOIN items p ON u.paddle_skin_item_id = p.id
	LEFT JOIN items b ON u.ball_skin_item_id = b.id
	LEFT JOIN items g ON u.goal_explosion_item_id = g.id
	WHERE ${whereClause}`;
}

function seedItem(itemKey, kind, displayName, isDefault) {
	db.run(
		`INSERT OR IGNORE INTO items (item_key, kind, display_name, is_default)
		VALUES (?, ?, ?, ?)`,
		[itemKey, kind, displayName, isDefault],
		(err) => {
			if (err) console.error(err);
		}
	);
}

export function seedCatalogStyles(
	kind,
	styles,
	{ includePaintVariants = false } = {}
) {
	db.serialize(() => {
		for (const [index, style] of styles.entries()) {
			const isDefault = index === 0 ? 1 : 0;
			seedItem(
				createCosmeticItemKey(style.styleIndex),
				kind,
				style.label,
				isDefault
			);

			if (!includePaintVariants) continue;

			for (const paintVariant of PAINT_VARIANTS) {
				seedItem(
					createCosmeticItemKey(style.styleIndex, paintVariant.key),
					kind,
					buildPaintedDisplayName(style.label, paintVariant.key),
					0
				);
			}
		}
	});
}
