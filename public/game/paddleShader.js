// Paddle shader definitions live here for easy reuse.
export const paddleVertexShader = `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

export const paddleFragmentShader = `
	void main() {
		gl_FragColor = vec4(0.2, 0.9, 0.2, 1.0);
	}
`;