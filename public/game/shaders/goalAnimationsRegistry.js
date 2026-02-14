import { ConfigurableGoalAnimation } from './configurableGoalAnimation.js';
import {
	GOAL_ANIMATION_CONFIGS,
	GOAL_EXPLOSION_STYLES
} from './animationConfigRegistry.js';

export function createGoalAnimationRegistry() {
	return new Map(
		GOAL_ANIMATION_CONFIGS.map((config) => [
			config.styleIndex,
			new ConfigurableGoalAnimation(config)
		])
	);
}

export { GOAL_EXPLOSION_STYLES };
