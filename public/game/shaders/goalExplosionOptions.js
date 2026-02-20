export const GOAL_EXPLOSION_STYLES = [
	{ id: 'NOVA', label: 'Nova', value: 0 },
	{ id: 'PIXEL_BURST', label: 'Pixel Burst', value: 1 },
	{ id: 'VORTEX', label: 'Vortex', value: 2 },
	{ id: 'BOOM_HEADSHOT', label: 'Boom Headshot', value: 3 },
	{ id: 'BLACK_HOLE', label: 'Black Hole', value: 4 },
	{ id: 'MONSOON', label: 'Monsoon', value: 5 },
	{ id: 'ORBITAL_STRIKE', label: 'Orbital Strike', value: 6 },
	{ id: 'SHATTERED_REALITY', label: 'Shattered Reality', value: 7 },
	{ id: 'BASS_DROP', label: 'Bass Drop', value: 8 },
	{ id: 'TOXIC_BLOOM', label: 'Toxic Bloom', value: 9 },
	{ id: 'CRYSTAL_SPIRE', label: 'Crystal Spire', value: 10 },
	{ id: 'GRAVITY_WELL', label: 'Gravity Well', value: 11 },
	{ id: 'SPOOKY', label: 'Spooky', value: 12 }
];

export const GOAL_EXPLOSION_COLOR_OPTIONS = [
	{ id: 'base', label: 'Base', value: null },
	{ id: 'cyan', label: 'Cyan', value: 0x6fe7ff },
	{ id: 'magenta', label: 'Magenta', value: 0xff6bd6 },
	{ id: 'white', label: 'White', value: 0xffffff },
	{ id: 'gold', label: 'Gold', value: 0xffd36b },
	{ id: 'lime', label: 'Lime', value: 0x7bff5a },
	{ id: 'blue', label: 'Blue', value: 0x5aa2ff },
	{ id: 'crimson', label: 'Crimson', value: 0xff3b4a },
	{ id: 'orange', label: 'Orange', value: 0xff8a3d },
	{ id: 'amber', label: 'Amber', value: 0xffc04a },
	{ id: 'chartreuse', label: 'Chartreuse', value: 0xb5ff3a },
	{ id: 'mint', label: 'Mint', value: 0x5cffb5 },
	{ id: 'teal', label: 'Teal', value: 0x22f0d6 },
	{ id: 'sky', label: 'Sky', value: 0x5cd6ff },
	{ id: 'indigo', label: 'Indigo', value: 0x5c6bff },
	{ id: 'violet', label: 'Violet', value: 0xa35cff },
	{ id: 'lavender', label: 'Lavender', value: 0xd7b3ff },
	{ id: 'rose', label: 'Rose', value: 0xff7ab8 },
	{ id: 'coral', label: 'Coral', value: 0xff6f61 },
	{ id: 'peach', label: 'Peach', value: 0xffb28a },
	{ id: 'seafoam', label: 'Seafoam', value: 0x78ffd6 },
	{ id: 'ice', label: 'Ice', value: 0xb8f1ff }
];

const VALID_COLOR_IDS = new Set(
	GOAL_EXPLOSION_COLOR_OPTIONS.map((option) => option.id)
);
const VALID_STYLE_VALUES = new Set(
	GOAL_EXPLOSION_STYLES.map((style) => style.value)
);

export function normalizeGoalExplosionStyleValue(input) {
	const parsed = Number(input);
	return VALID_STYLE_VALUES.has(parsed) ? parsed : GOAL_EXPLOSION_STYLES[0].value;
}

export function normalizeGoalExplosionColorId(input) {
	const id = String(input ?? 'base')
		.trim()
		.toLowerCase();
	return VALID_COLOR_IDS.has(id) ? id : 'base';
}

export function getGoalExplosionColorValueById(input) {
	const colorId = normalizeGoalExplosionColorId(input);
	return (
		GOAL_EXPLOSION_COLOR_OPTIONS.find((option) => option.id === colorId)?.value ??
		null
	);
}
