
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const GROUND_Y = 700;

export const GRAVITY = 0.6;
export const DRAG = 0.98;

export interface CharStats {
  JUMP_FORCE: number;
  KICK_VELOCITY_X: number;
  KICK_VELOCITY_Y: number;
  SIZE: number;
  COLOR: string;
  GLOW: string;
  MASS: number;
  NAME: string;
  DESC: string;
  ATTRIBUTES: { SPEED: number, JUMP: number, WEIGHT: number } // 1-10 scale for UI
}

// Character: Triangle (Speedster)
export const TRIANGLE_STATS: CharStats = {
  JUMP_FORCE: -18,
  KICK_VELOCITY_X: 18,
  KICK_VELOCITY_Y: 12,
  SIZE: 40,
  COLOR: '#00ffff', // Cyan
  GLOW: '#00aaaa',
  MASS: 1.0,
  NAME: 'VECTOR',
  DESC: 'High jump, fast horizontal attacks. A glass cannon.',
  ATTRIBUTES: { SPEED: 9, JUMP: 9, WEIGHT: 3 }
};

// Character: Square (Balanced)
export const SQUARE_STATS: CharStats = {
  JUMP_FORCE: -16.5,
  KICK_VELOCITY_X: 16,
  KICK_VELOCITY_Y: 16,
  SIZE: 45,
  COLOR: '#FFD700', // Gold
  GLOW: '#AA8800',
  MASS: 1.2,
  NAME: 'BOXER',
  DESC: 'Balanced stats. Reliable and sturdy.',
  ATTRIBUTES: { SPEED: 6, JUMP: 6, WEIGHT: 6 }
};

// Character: Pentagon (Tank)
export const PENTAGON_STATS: CharStats = {
  JUMP_FORCE: -15, // Lower jump
  KICK_VELOCITY_X: 14, // Slower kick speed
  KICK_VELOCITY_Y: 20, // Faster drop (heavier)
  SIZE: 50, // Bigger
  COLOR: '#ff00ff', // Magenta
  GLOW: '#aa00aa',
  MASS: 1.5,
  NAME: 'TANK',
  DESC: 'Heavy weight, crushing dive speed. Hard to move.',
  ATTRIBUTES: { SPEED: 4, JUMP: 4, WEIGHT: 10 }
};

// Character: Diamond (Sniper)
export const DIAMOND_STATS: CharStats = {
  JUMP_FORCE: -20, // Super high jump
  KICK_VELOCITY_X: 22, // Super fast kick
  KICK_VELOCITY_Y: 10, // Floaty drop
  SIZE: 40,
  COLOR: '#00FF00', // Lime
  GLOW: '#00AA00',
  MASS: 0.8,
  NAME: 'VIPER',
  DESC: 'Extreme mobility and range. Very floaty.',
  ATTRIBUTES: { SPEED: 10, JUMP: 10, WEIGHT: 2 }
};

export const TRAIL_LENGTH = 12;
export const FPS = 60;
export const SLOW_MO_DURATION = 60; // Frames
export const WIN_SCORE = 5;
