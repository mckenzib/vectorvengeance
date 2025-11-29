
export interface Point {
  x: number;
  y: number;
}

export enum PlayerState {
  GROUND = 'GROUND',
  JUMP_SQUAT = 'JUMP_SQUAT', // Small delay before jump
  AIR = 'AIR',
  KICKING = 'KICKING',
  RECOIL = 'RECOIL', // Knocked back
  WINNER = 'WINNER',
  LOSER = 'LOSER'
}

export enum CharacterType {
  TRIANGLE = 'TRIANGLE',
  SQUARE = 'SQUARE',
  PENTAGON = 'PENTAGON',
  DIAMOND = 'DIAMOND'
}

export enum GameMode {
  PVP = 'PVP',
  CPU = 'CPU'
}

export interface Player {
  id: number;
  type: CharacterType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  state: PlayerState;
  facingRight: boolean;
  color: string;
  trail: Point[];
  score: number;
  width: number;
  height: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameState {
  p1: Player;
  p2: Player;
  particles: Particle[];
  round: number;
  roundActive: boolean;
  slowMotionTimer: number; // > 0 means slow motion is active
  winner: number | null; // 1 or 2
}
