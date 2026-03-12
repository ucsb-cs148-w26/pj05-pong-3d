import { PADDLE_STYLE_CATALOG } from '../../public/game/shaders/paddleSkin.js';
import { seedCatalogStyles } from './helpers.js';

export function initializePaddleSkins() {
	seedCatalogStyles('paddle_skin', PADDLE_STYLE_CATALOG, {
		includePaintVariants: true
	});
}
