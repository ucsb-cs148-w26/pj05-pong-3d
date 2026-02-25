import * as THREE from 'three';

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function smoothstep(edge0, edge1, x) {
	const t = Math.min(1.0, Math.max(0.0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3.0 - 2.0 * t);
}

export function randomDirection() {
	return new THREE.Vector3(
		Math.random() * 2 - 1,
		Math.random() * 2 - 1,
		Math.random() * 2 - 1
	).normalize();
}

export const TWEEN = {
	Easing: {
		Linear: {
			None: (k) => clamp(k)
		},
		Quadratic: {
			In: (k) => clamp(k * k),
			Out: (k) => {
				k = clamp(k);
				return clamp(k * (2 - k));
			},
			InOut: (k) => {
				k = clamp(k) * 2;
				if (k < 1) return clamp(0.5 * k * k);
				k -= 1;
				return clamp(-0.5 * (k * (k - 2) - 1));
			}
		},
		Cubic: {
			In: (k) => clamp(k * k * k),
			Out: (k) => {
				k = clamp(k) - 1;
				return clamp(k * k * k + 1);
			},
			InOut: (k) => {
				k = clamp(k) * 2;
				if (k < 1) return clamp(0.5 * k * k * k);
				k -= 2;
				return clamp(0.5 * (k * k * k + 2));
			}
		},
		Quartic: {
			In: (k) => clamp(k * k * k * k),
			Out: (k) => {
				k = clamp(k) - 1;
				return clamp(1 - k * k * k * k);
			},
			InOut: (k) => {
				k = clamp(k) * 2;
				if (k < 1) return clamp(0.5 * k * k * k * k);
				k -= 2;
				return clamp(-0.5 * (k * k * k * k - 2));
			}
		},
		Quintic: {
			In: (k) => clamp(k * k * k * k * k),
			Out: (k) => {
				k = clamp(k) - 1;
				return clamp(k * k * k * k * k + 1);
			},
			InOut: (k) => {
				k = clamp(k) * 2;
				if (k < 1) return clamp(0.5 * k * k * k * k * k);
				k -= 2;
				return clamp(0.5 * (k * k * k * k * k + 2));
			}
		},
		Sinusoidal: {
			In: (k) => clamp(1 - Math.cos((clamp(k) * Math.PI) / 2)),
			Out: (k) => clamp(Math.sin((clamp(k) * Math.PI) / 2)),
			InOut: (k) => clamp(0.5 * (1 - Math.cos(Math.PI * clamp(k))))
		},
		Exponential: {
			In: (k) => {
				k = clamp(k);
				return k === 0 ? 0 : clamp(Math.pow(1024, k - 1));
			},
			Out: (k) => {
				k = clamp(k);
				return k === 1 ? 1 : clamp(1 - Math.pow(2, -10 * k));
			},
			InOut: (k) => {
				k = clamp(k);
				if (k === 0) return 0;
				if (k === 1) return 1;
				k *= 2;
				if (k < 1) return clamp(0.5 * Math.pow(1024, k - 1));
				return clamp(0.5 * (-Math.pow(2, -10 * (k - 1)) + 2));
			}
		},
		Circular: {
			In: (k) => {
				k = clamp(k);
				return clamp(1 - Math.sqrt(1 - k * k));
			},
			Out: (k) => {
				k = clamp(k) - 1;
				return clamp(Math.sqrt(1 - k * k));
			},
			InOut: (k) => {
				k = clamp(k) * 2;
				if (k < 1) return clamp(-0.5 * (Math.sqrt(1 - k * k) - 1));
				k -= 2;
				return clamp(0.5 * (Math.sqrt(1 - k * k) + 1));
			}
		},
		Elastic: {
			In: (k) => {
				k = clamp(k);
				if (k === 0) return 0;
				if (k === 1) return 1;
				return clamp(
					-Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI)
				);
			},
			Out: (k) => {
				k = clamp(k);
				if (k === 0) return 0;
				if (k === 1) return 1;
				return clamp(
					Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1
				);
			},
			InOut: (k) => {
				k = clamp(k);
				if (k === 0) return 0;
				if (k === 1) return 1;
				k *= 2;
				if (k < 1) {
					return clamp(
						-0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI)
					);
				}
				return clamp(
					0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) +
						1
				);
			}
		},
		Back: {
			In: (k) => {
				k = clamp(k);
				const s = 1.70158;
				return clamp(k * k * ((s + 1) * k - s));
			},
			Out: (k) => {
				k = clamp(k) - 1;
				const s = 1.70158;
				return clamp(k * k * ((s + 1) * k + s) + 1);
			},
			InOut: (k) => {
				k = clamp(k);
				const s = 1.70158 * 1.525;
				k *= 2;
				if (k < 1) return clamp(0.5 * (k * k * ((s + 1) * k - s)));
				k -= 2;
				return clamp(0.5 * (k * k * ((s + 1) * k + s) + 2));
			}
		},
		Bounce: {
			In: (k) => clamp(1 - TWEEN.Easing.Bounce.Out(1 - clamp(k))),
			Out: (k) => {
				k = clamp(k);
				if (k < 1 / 2.75) {
					return clamp(7.5625 * k * k);
				}
				if (k < 2 / 2.75) {
					k -= 1.5 / 2.75;
					return clamp(7.5625 * k * k + 0.75);
				}
				if (k < 2.5 / 2.75) {
					k -= 2.25 / 2.75;
					return clamp(7.5625 * k * k + 0.9375);
				}
				k -= 2.625 / 2.75;
				return clamp(7.5625 * k * k + 0.984375);
			},
			InOut: (k) => {
				k = clamp(k);
				if (k < 0.5) return clamp(TWEEN.Easing.Bounce.In(k * 2) * 0.5);
				return clamp(TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5);
			}
		}
	}
};
