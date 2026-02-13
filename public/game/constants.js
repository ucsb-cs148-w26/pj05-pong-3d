export const STATIC_MASS = 999999;

export const SIMULATION_RATE = 120; // must be ~same between client and server

export const PADDLE_THICKNESS = 0.5;
export const PADDLE_HEIGHT = 3;
export const PADDLE_DEPTH = 3;
export const PADDLE_ACCEL = 40;
export const PADDLE_BOUND = 5.75;
export const PADDLE_VELOCITY_DAMPING = -0.25;

export const ARENA_DEPTH = 23.5;
export const ARENA_SIZE = 15;
export const WALL_THICKNESS = 3;
export const ARENA_END_OFFSET = ARENA_DEPTH / 2 + WALL_THICKNESS / 2 + 1 / 32;
export const ARENA_WALL_OFFSET_Y = 9;
export const ARENA_WALL_OFFSET_Z = 9;
export const ARENA_COLOR = 0x222222;

export const BALL_RADIUS = 0.5;
export const BALL_COLOR = 0xffffff;
export const BALL_MASS = 3;
export const BALL_INITIAL_SPEED = 5;
export const BALL_TINY_V_SCALE = 0.1;
