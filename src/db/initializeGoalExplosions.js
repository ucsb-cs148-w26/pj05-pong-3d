import { GOAL_EXPLOSION_STYLES } from '../../public/game/shaders/goalAnimations.js';
import { seedCatalogStyles } from './helpers.js';

export function initializeGoalExplosions() {
	seedCatalogStyles('goal_explosion', GOAL_EXPLOSION_STYLES, {
		includePaintVariants: true
	});
}
