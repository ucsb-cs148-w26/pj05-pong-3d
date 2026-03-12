import { BALL_SKIN_STYLES } from '../../public/game/shaders/ballSkin.js';
import { seedCatalogStyles } from './helpers.js';

export function initializeBallSkins() {
	seedCatalogStyles('ball_skin', BALL_SKIN_STYLES);
}
