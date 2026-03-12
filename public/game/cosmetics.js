export const PAINT_VARIANTS = Object.freeze([
	Object.freeze({
		key: 'cobalt',
		label: 'Cobalt',
		color: 0x3556c5
	}),
	Object.freeze({
		key: 'crimson',
		label: 'Crimson',
		color: 0x9f1d35
	}),
	Object.freeze({
		key: 'black',
		label: 'Black',
		color: 0x1a1a1a
	}),
	Object.freeze({
		key: 'forest-green',
		label: 'Forest Green',
		color: 0x1f6b3a
	}),
	Object.freeze({
		key: 'purple',
		label: 'Purple',
		color: 0x7b4ad9
	}),
	Object.freeze({
		key: 'saffron',
		label: 'Saffron',
		color: 0xf4c542
	}),
	Object.freeze({
		key: 'lime',
		label: 'Lime',
		color: 0x8de549
	}),
	Object.freeze({
		key: 'pink',
		label: 'Pink',
		color: 0xff77b7
	}),
	Object.freeze({
		key: 'grey',
		label: 'Grey',
		color: 0x8e96a3
	}),
	Object.freeze({
		key: 'sky-blue',
		label: 'Sky Blue',
		color: 0x79ceff
	}),
	Object.freeze({
		key: 'orange',
		label: 'Orange',
		color: 0xff922b
	}),
	Object.freeze({
		key: 'blinding-white',
		label: 'Blinding White',
		color: 0xfafcff
	})
]);

const COSMETIC_ITEM_KEY_SEPARATOR = ':';
const PAINT_VARIANT_BY_KEY = new Map(
	PAINT_VARIANTS.map((variant) => [variant.key, variant])
);

export function createCosmeticItemKey(styleIndex, paintKey = null) {
	const normalizedStyleIndex = Number.parseInt(styleIndex, 10);
	if (!Number.isFinite(normalizedStyleIndex)) return '';
	if (!paintKey) return String(normalizedStyleIndex);
	return `${normalizedStyleIndex}${COSMETIC_ITEM_KEY_SEPARATOR}${paintKey}`;
}

export function parseCosmeticItemKey(itemKey) {
	const rawValue = String(itemKey ?? '');
	const [styleIndexToken, paintKeyToken] = rawValue.split(
		COSMETIC_ITEM_KEY_SEPARATOR,
		2
	);
	const styleIndex = Number.parseInt(styleIndexToken, 10);

	return {
		styleIndex: Number.isFinite(styleIndex) ? styleIndex : null,
		paintKey: paintKeyToken || null
	};
}

export function resolveCosmeticItemSelection(itemKey) {
	const selection = parseCosmeticItemKey(itemKey);
	return {
		...selection,
		paintColor: getPaintColor(selection.paintKey)
	};
}

export function getPaintVariant(paintKey) {
	if (!paintKey) return null;
	return PAINT_VARIANT_BY_KEY.get(String(paintKey)) ?? null;
}

export function getPaintColor(paintKey) {
	return getPaintVariant(paintKey)?.color ?? null;
}

export function buildPaintedDisplayName(baseLabel, paintKey) {
	const paintVariant = getPaintVariant(paintKey);
	if (!paintVariant) return baseLabel;
	return `${baseLabel} (${paintVariant.label})`;
}
