import React, { useEffect, useRef } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GROUND_Y, 
  GRAVITY, 
  DRAG, 
  TRIANGLE_STATS, 
  SQUARE_STATS,
  PENTAGON_STATS,
  DIAMOND_STATS,
  TRAIL_LENGTH,
  SLOW_MO_DURATION,
  CharStats
} from '../constants';
import { Player, PlayerState, CharacterType, Particle, GameMode } from '../types';

interface GameCanvasProps {
  onScoreUpdate: (p1Score: number, p2Score: number) => void;
  onRoundEnd: (winnerId: number) => void;
  gameActive: boolean;
  resetTrigger: number;
  gameMode: GameMode;
  p1Type: CharacterType;
  p2Type: CharacterType;
  p1Score: number;
  p2Score: number;
  aiDifficulty: number; // 1-10
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onScoreUpdate, 
  onRoundEnd, 
  gameActive,
  resetTrigger,
  gameMode,
  p1Type,
  p2Type,
  p1Score,
  p2Score,
  aiDifficulty
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Input State (using Refs for instant access in loop)
  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Callbacks Refs (To avoid stale closures in game loop)
  const onRoundEndRef = useRef(onRoundEnd);
  const onScoreUpdateRef = useRef(onScoreUpdate);

  // Update refs on render
  useEffect(() => {
    onRoundEndRef.current = onRoundEnd;
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onRoundEnd, onScoreUpdate]);
  
  // AI State
  const aiState = useRef<{
    nextThinkTime: number;
    holdingJump: boolean;
    holdingDive: boolean;
  }>({
    nextThinkTime: 0,
    holdingJump: false,
    holdingDive: false,
  });
  
  // Game State Refs (Mutable to avoid React renders in game loop)
  const gameState = useRef<{
    p1: Player;
    p2: Player;
    particles: Particle[];
    slowMo: number;
    shaker: number;
    roundOver: boolean;
    frameCount: number;
  }>({
    p1: createPlayer(1, p1Type, 200),
    p2: createPlayer(2, p2Type, CANVAS_WIDTH - 200),
    particles: [],
    slowMo: 0,
    shaker: 0,
    roundOver: false,
    frameCount: 0
  });

  function getStats(type: CharacterType): CharStats {
    switch (type) {
        case CharacterType.TRIANGLE: return TRIANGLE_STATS;
        case CharacterType.SQUARE: return SQUARE_STATS;
        case CharacterType.PENTAGON: return PENTAGON_STATS;
        case CharacterType.DIAMOND: return DIAMOND_STATS;
        default: return TRIANGLE_STATS;
    }
  }

  // Helper to create player
  function createPlayer(id: number, type: CharacterType, startX: number): Player {
    const stats = getStats(type);
    
    return {
      id,
      type,
      x: startX,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      rotation: 0,
      state: PlayerState.GROUND,
      facingRight: id === 1,
      color: stats.COLOR,
      trail: [],
      score: 0,
      width: stats.SIZE,
      height: stats.SIZE
    };
  }

  const spawnParticles = (x: number, y: number, color: string, count: number = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      gameState.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color
      });
    }
  };

  const updateAI = () => {
    const now = Date.now();
    const s = gameState.current;
    
    // Normalized Difficulty Factor (0.0 to 1.0)
    // Level 1 = 0.0
    // Level 10 = 1.0
    const level = (aiDifficulty - 1) / 9;

    // Reaction Speed: Linear progression from Human (600ms) to Machine (0ms)
    // Level 1: 600ms
    // Level 5: ~330ms
    // Level 10: 0ms
    const baseReactionTime = Math.max(0, 600 * (1 - level)); 

    // Error Rate: Linear 30% -> 0%
    const errorChance = 0.3 * (1 - level);

    // AI Tick Logic
    // If not ready to think, return. 
    // Level 10 thinks every frame (if baseReactionTime is 0)
    if (now < aiState.current.nextThinkTime) return;

    // Reset Inputs
    aiState.current.holdingJump = false;
    aiState.current.holdingDive = false;

    // Schedule next think
    // Add small noise so AI isn't perfectly rhythmic, unless Level 10
    const noise = level === 1.0 ? 0 : Math.random() * 50;
    aiState.current.nextThinkTime = now + baseReactionTime + noise;

    // --- RANDOM ERROR CHECK ---
    // Lower levels sometimes just panic jump or do nothing
    if (Math.random() < errorChance) {
        if (Math.random() < 0.5) aiState.current.holdingJump = true;
        return;
    }

    const p1 = s.p1;
    const p2 = s.p2;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.hypot(dx, dy);
    const absDx = Math.abs(dx);
    
    const p1Attacking = p1.state === PlayerState.KICKING || (p1.state === PlayerState.AIR && p1.vy > 0);
    const p2CanAttack = p2.state === PlayerState.AIR;

    // Helper: SKILL CHECK
    // Returns true if the AI is "smart enough" to execute a specific tactic this frame.
    // e.g. passesSkillCheck(0.5) requires Level 6+ to even attempt, and higher levels succeed more often.
    const passesSkillCheck = (difficultyThreshold: number = 0) => {
        if (level < difficultyThreshold) return false; // Too hard for this level
        return Math.random() < level; // Higher level = higher consistency
    };

    // --- LOGIC TREE ---

    // 1. FRAME TRAP / PUNISH (The "Gotcha")
    // If P1 is in recoil or landing lag, kill them immediately.
    // Threshold: 0.3 (Level 4+)
    const p1Vulnerable = p1.state === PlayerState.RECOIL || (p1.state === PlayerState.GROUND && p1.vy === 0 && absDx < 400);
    
    if (p1Vulnerable && p2CanAttack && p2.y < p1.y - 50) {
        if (passesSkillCheck(0.3)) {
             aiState.current.holdingDive = true;
             return; // Priority Action
        }
    }

    // 2. ANTI-AIR / COUNTER (The "Head Stomp")
    // If P1 is diving at us, and we are on ground, jump OVER them to stomp their head.
    // Threshold: 0.5 (Level 6+)
    if (p1.state === PlayerState.KICKING && p2.state === PlayerState.GROUND) {
        const closingSpeed = Math.abs(p1.vx);
        if (closingSpeed > 0) {
            const timeToImpact = absDx / closingSpeed;
            // Impact imminent (approx 0.5s)
            if (timeToImpact < 30) {
                 if (passesSkillCheck(0.5)) {
                     aiState.current.holdingJump = true;
                     // Force quick rethink to hit the dive
                     aiState.current.nextThinkTime = now + 50;
                     return;
                 } else if (level < 0.3) {
                     // Low level panic response
                     aiState.current.holdingDive = true; // Suicide
                 }
            }
        }
    }

    // 3. AIR GAME
    if (p2.state === PlayerState.AIR) {
        const p2Above = p2.y < p1.y - 20;

        if (p2Above) {
            // OFFENSE: We are above
            if (absDx < 150) {
                // Kill Zone
                aiState.current.holdingDive = true;
            } else if (absDx > 300 && passesSkillCheck(0.7)) {
                // MOBILITY: Use dive to gap close aggressively (Level 8+)
                aiState.current.holdingDive = true;
            }
        } else {
            // DEFENSE: We are below or level
            if (p1Attacking && dist < 250) {
                // If they are attacking and close, we are in danger.
                if (passesSkillCheck(0.4)) {
                    // Smart: Do nothing, drift away, land safe
                } else {
                    // Dumb: Panic Dive (usually gets hit)
                    aiState.current.holdingDive = true; 
                }
            }
        }
        return;
    }

    // 4. GROUND GAME
    if (p2.state === PlayerState.GROUND) {
        if (p1Attacking && dist < 400) {
            // DEFENSE
            if (absDx < 150) {
                // Imminent Hit
                if (passesSkillCheck(0.6)) {
                    // Smart: Jump straight up to dodge/punish
                    aiState.current.holdingJump = true;
                } else {
                    // Dumb: Panic Dive
                    aiState.current.holdingDive = true;
                }
            } else {
                // Evasive Maneuver
                // Higher levels jump less randomly, more purposefully
                if (Math.random() < 0.5 + (level * 0.3)) {
                     aiState.current.holdingJump = true;
                }
            }
        } else {
            // NEUTRAL / SPACING
            // Maintain optimal range (~350px)
            if (absDx > 500) {
                // Gap Close
                // Higher levels are more aggressive
                if (Math.random() < 0.05 * (1 + level * 2)) aiState.current.holdingJump = true;
            } else if (absDx < 200) {
                // Too Close (Crowded)
                if (passesSkillCheck(0.2)) {
                     aiState.current.holdingJump = true; // Reposition
                }
            }
        }
    }
  };

  const updatePhysics = () => {
    const state = gameState.current;
    if (state.roundOver) return; 

    // AI Update
    if (gameMode === GameMode.CPU) {
        updateAI();
    }

    const players = [state.p1, state.p2];

    // Face each other logic (Dynamic)
    if (state.p1.x < state.p2.x) {
        state.p1.facingRight = true;
        state.p2.facingRight = false;
    } else {
        state.p1.facingRight = false;
        state.p2.facingRight = true;
    }

    players.forEach(p => {
      const stats = getStats(p.type);

      // Apply Gravity
      if (p.state !== PlayerState.GROUND) {
        p.vy += GRAVITY * stats.MASS;
      }

      // Apply Drag
      p.vx *= DRAG;

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Ground Collision
      if (p.y >= GROUND_Y - p.height / 2) {
        p.y = GROUND_Y - p.height / 2;
        p.vy = 0;
        if (p.state !== PlayerState.GROUND && p.state !== PlayerState.JUMP_SQUAT) {
          p.state = PlayerState.GROUND;
          // Landing particles
          spawnParticles(p.x, p.y + p.height/2, p.color, 5);
        }
      }

      // Wall Collision
      if (p.x < p.width/2) {
        p.x = p.width/2;
        p.vx = 0;
      }
      if (p.x > CANVAS_WIDTH - p.width/2) {
        p.x = CANVAS_WIDTH - p.width/2;
        p.vx = 0;
      }

      // Trail Update
      if (gameActive) { // Only update trails if not paused/menu
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > TRAIL_LENGTH) p.trail.shift();
      }

      // Input Handling
      const isP1 = p.id === 1;
      const isCPU = !isP1 && gameMode === GameMode.CPU;
      
      let jumpPressed = false;
      let divePressed = false;

      if (isCPU) {
          jumpPressed = aiState.current.holdingJump;
          divePressed = aiState.current.holdingDive;
      } else if (isP1) {
          jumpPressed = keys.current['KeyS']; // P1 Jump
          divePressed = keys.current['KeyD']; // P1 Dive
      } else {
          jumpPressed = keys.current['KeyK']; // P2 Jump
          divePressed = keys.current['KeyL']; // P2 Dive
      }

      // Jump Logic
      if (jumpPressed && p.state === PlayerState.GROUND) {
          p.state = PlayerState.AIR;
          p.vy = stats.JUMP_FORCE;
          spawnParticles(p.x, p.y + p.height/2, '#ffffff', 3);
      }

      // Dive Logic
      if (divePressed && p.state === PlayerState.AIR) {
          p.state = PlayerState.KICKING;
          p.vy = stats.KICK_VELOCITY_Y;
          p.vx = p.facingRight ? stats.KICK_VELOCITY_X : -stats.KICK_VELOCITY_X;
          
          // Boom effect on start dive
          spawnParticles(p.x, p.y, p.color, 5);
      }
    });

    // Player vs Player Collision
    const p1 = state.p1;
    const p2 = state.p2;

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const minDist = (p1.width + p2.width) / 2;

    if (dist < minDist) {
        // Collision!
        
        // Check win conditions
        const p1Kicking = p1.state === PlayerState.KICKING;
        const p2Kicking = p2.state === PlayerState.KICKING;

        if (p1Kicking && !p2Kicking) {
            handleRoundWin(1);
        } else if (p2Kicking && !p1Kicking) {
            handleRoundWin(2);
        } else if (p1Kicking && p2Kicking) {
            // CLASH (Both kicking) - Winner is whoever is HIGHER
            const heightDiff = p2.y - p1.y; // Positive if p2 is lower (p1 is higher)
            const margin = 10;

            if (heightDiff > margin) {
                // P1 is higher
                handleRoundWin(1);
            } else if (heightDiff < -margin) {
                // P2 is higher
                handleRoundWin(2);
            } else {
                // True Tie/Clash -> Recoil
                p1.vx = -p1.vx * 1.5;
                p1.vy = -10;
                p1.state = PlayerState.RECOIL;
                
                p2.vx = -p2.vx * 1.5;
                p2.vy = -10;
                p2.state = PlayerState.RECOIL;

                state.shaker = 15;
                spawnParticles((p1.x+p2.x)/2, (p1.y+p2.y)/2, '#ffffff', 30);
            }
        } else {
            // Body bump (push apart)
            const angle = Math.atan2(dy, dx);
            const force = 3;
            p1.vx += Math.cos(angle) * force;
            p1.vy += Math.sin(angle) * force;
            p2.vx -= Math.cos(angle) * force;
            p2.vy -= Math.sin(angle) * force;
        }
    }

    // Particle Update
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const part = state.particles[i];
        part.x += part.vx;
        part.y += part.vy;
        part.life -= 0.05;
        if (part.life <= 0) state.particles.splice(i, 1);
    }

    // Screen shake decay
    if (state.shaker > 0) state.shaker *= 0.9;
    
    state.frameCount++;
  };

  const handleRoundWin = (winnerId: number) => {
      const state = gameState.current;
      if (state.roundOver) return;

      state.roundOver = true;
      state.slowMo = SLOW_MO_DURATION;
      state.shaker = 20;

      const winner = winnerId === 1 ? state.p1 : state.p2;
      const loser = winnerId === 1 ? state.p2 : state.p1;

      // Effects
      spawnParticles(loser.x, loser.y, loser.color, 50);
      spawnParticles(winner.x, winner.y, '#ffffff', 20);

      // Update external state
      onRoundEndRef.current(winnerId);
  };

  // --- BACKGROUND DRAWING ---
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
      const state = gameState.current;
      const scroll = state.p1.x * 0.05; // Parallax scroll based on P1
      const time = state.frameCount * 0.01;

      const p1Stats = getStats(p1Type);
      const p2Stats = getStats(p2Type);

      ctx.save();
      
      // LAYER 1: SKYLINE (Based on P1 Type) - UPPER BACKGROUND
      ctx.strokeStyle = p1Stats.COLOR;
      ctx.globalAlpha = 0.2; // Increase visibility
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p1Stats.COLOR;
      
      if (p1Type === CharacterType.TRIANGLE) {
          // Sharp Mountains
          ctx.beginPath();
          for(let i = -200; i < CANVAS_WIDTH + 200; i+= 100) {
              const h = 200 + Math.sin(i * 0.1 + 1) * 100;
              ctx.moveTo(i - scroll, CANVAS_HEIGHT);
              ctx.lineTo(i + 50 - scroll, CANVAS_HEIGHT - h);
              ctx.lineTo(i + 100 - scroll, CANVAS_HEIGHT);
          }
          ctx.stroke();
      } else if (p1Type === CharacterType.SQUARE) {
          // City Blocks
          ctx.beginPath();
          for(let i = -200; i < CANVAS_WIDTH + 200; i+= 80) {
              const h = 150 + Math.abs(Math.cos(i * 123)) * 150;
              ctx.rect(i - scroll, CANVAS_HEIGHT - h, 60, h);
          }
          ctx.stroke();
      } else if (p1Type === CharacterType.DIAMOND) {
          // Laser Rain
          ctx.beginPath();
          ctx.setLineDash([20, 40]);
          for(let i = -400; i < CANVAS_WIDTH + 400; i+= 100) {
              ctx.moveTo(i - scroll, 0);
              ctx.lineTo(i - 200 - scroll, CANVAS_HEIGHT);
          }
          ctx.stroke();
          ctx.setLineDash([]);
      } else if (p1Type === CharacterType.PENTAGON) {
          // Floating Monoliths
          ctx.beginPath();
          for(let i = 0; i < 8; i++) {
              const x = (i * 250 - scroll * 1.5) % (CANVAS_WIDTH + 500);
              const finalX = x < -200 ? x + CANVAS_WIDTH + 500 : x;
              const y = 300 + Math.sin(i + time) * 50;
              
              // Draw Hexagon
              ctx.moveTo(finalX + 40, y);
              for(let k=1; k<=6; k++) {
                  const angle = k * Math.PI / 3;
                  ctx.lineTo(finalX + Math.cos(angle)*40, y + Math.sin(angle)*40);
              }
          }
          ctx.stroke();
      }

      // LAYER 2: FLOOR GRID (Based on P2 Type) - LOWER BACKGROUND
      ctx.strokeStyle = p2Stats.COLOR;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 5;
      ctx.shadowColor = p2Stats.COLOR;

      // Default Horizon line
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      if (p2Type === CharacterType.TRIANGLE) {
          // Diagonal Fast Grid
          ctx.beginPath();
          for(let x=-500; x<CANVAS_WIDTH+500; x+=80) {
               ctx.moveTo(x - scroll * 2, GROUND_Y);
               ctx.lineTo(x - 400 - scroll * 2, CANVAS_HEIGHT);
          }
          ctx.stroke();
      } else if (p2Type === CharacterType.SQUARE) {
          // Standard Perspective Grid
          ctx.beginPath();
          const centerX = CANVAS_WIDTH / 2;
          for(let x=-1000; x<CANVAS_WIDTH+1000; x+=100) {
               // Pseudo-3D floor lines
               ctx.moveTo(x - scroll * 0.5, GROUND_Y);
               // Spread out towards bottom
               const dist = (x - scroll * 0.5) - centerX;
               ctx.lineTo(centerX + dist * 4, CANVAS_HEIGHT);
          }
          // Horizontal lines
          for(let y=GROUND_Y; y<CANVAS_HEIGHT; y+=40) {
              ctx.moveTo(0, y);
              ctx.lineTo(CANVAS_WIDTH, y);
          }
          ctx.stroke();
      } else if (p2Type === CharacterType.PENTAGON) {
          // Honeycomb Floor
          ctx.beginPath();
          const hexSize = 50;
          for(let y=GROUND_Y; y<CANVAS_HEIGHT + 50; y+= hexSize * 1.5) {
             for(let x=-100; x<CANVAS_WIDTH+100; x+= hexSize * 2) {
                 const offset = x - (scroll * 0.8) % (hexSize * 2);
                 ctx.moveTo(offset, y);
                 ctx.lineTo(offset + hexSize, y);
                 ctx.lineTo(offset + hexSize*1.5, y + hexSize);
                 ctx.lineTo(offset + hexSize, y + hexSize*2); // Close some loops
             }
          }
          ctx.stroke();
      } else if (p2Type === CharacterType.DIAMOND) {
          // Matrix Cross Grid
          ctx.beginPath();
          for(let x=-500; x<CANVAS_WIDTH+500; x+=100) {
             ctx.moveTo(x - scroll, GROUND_Y);
             ctx.lineTo(x + 100 - scroll, CANVAS_HEIGHT);
             ctx.moveTo(x + 100 - scroll, GROUND_Y);
             ctx.lineTo(x - scroll, CANVAS_HEIGHT);
          }
          ctx.stroke();
      }
      
      ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Shake
    ctx.save();
    if (state.shaker > 0.5) {
        ctx.translate((Math.random() - 0.5) * state.shaker, (Math.random() - 0.5) * state.shaker);
    }

    // DRAW BACKGROUNDS
    drawBackground(ctx);

    // Ground Line (Main)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Players
    [state.p1, state.p2].forEach(p => {
        // Trail
        if (p.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 0; i < p.trail.length - 1; i++) {
                const ratio = i / p.trail.length; // 0 to 1
                ctx.globalAlpha = ratio * 0.6; // Fade out tail
                ctx.lineWidth = 2 + ratio * 4; // Taper tail
                ctx.strokeStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10 * ratio;

                ctx.beginPath();
                ctx.moveTo(p.trail[i].x, p.trail[i].y);
                ctx.lineTo(p.trail[i+1].x, p.trail[i+1].y);
                ctx.stroke();
            }
            // Connect last trail point to current position
            const last = p.trail[p.trail.length - 1];
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.restore();
        }

        // Shape
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Rotation based on state
        if (p.state === PlayerState.KICKING) {
             // Point towards velocity
             const angle = Math.atan2(p.vy, p.vx);
             ctx.rotate(angle);
        } else {
            // Slight tilt based on x velocity
            ctx.rotate(p.vx * 0.05);
        }
        
        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#000'; // Hollow vector style

        ctx.beginPath();
        const s = p.width / 2;
        
        if (p.type === CharacterType.TRIANGLE) {
            ctx.moveTo(s, 0); // Front point (facing right default)
            ctx.lineTo(-s, -s/1.5);
            ctx.lineTo(-s, s/1.5);
            ctx.closePath();
        } else if (p.type === CharacterType.SQUARE) {
            ctx.rect(-s, -s, p.width, p.height);
        } else if (p.type === CharacterType.PENTAGON) {
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI / 5);
                const px = s * Math.cos(angle);
                const py = s * Math.sin(angle);
                if (i===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else if (p.type === CharacterType.DIAMOND) {
            ctx.moveTo(s, 0);
            ctx.lineTo(0, -s);
            ctx.lineTo(-s, 0);
            ctx.lineTo(0, s);
            ctx.closePath();
        }

        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // Particles
    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  useEffect(() => {
    const loop = () => {
      // Determine Time Step
      let steps = 1;
      const state = gameState.current;

      if (state.slowMo > 0) {
          state.slowMo--;
          // Update physics only every 10th frame for slow mo look
          if (state.slowMo % 10 !== 0) steps = 0; 
      }

      if (steps > 0) {
          updatePhysics();
      }
      
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) draw(ctx);
      }
      
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameActive, gameMode, aiDifficulty]);

  // Round Reset Effect
  useEffect(() => {
    // Only reset positions when resetTrigger changes (New Round / New Game)
    const s = gameState.current;
    
    s.p1 = createPlayer(1, p1Type, 200);
    s.p2 = createPlayer(2, p2Type, CANVAS_WIDTH - 200);
    s.particles = [];
    s.slowMo = 0;
    s.shaker = 0;
    s.roundOver = false;
    s.p1.score = p1Score;
    s.p2.score = p2Score;
    s.frameCount = 0;
    
    // AI Reset
    aiState.current.nextThinkTime = Date.now() + 1000;
    aiState.current.holdingJump = false;
    aiState.current.holdingDive = false;

  }, [resetTrigger, p1Type, p2Type]); 

  // Score Sync Effect
  useEffect(() => {
      gameState.current.p1.score = p1Score;
      gameState.current.p2.score = p2Score;
  }, [p1Score, p2Score]);

  // Input Listeners
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain bg-black"
    />
  );
};
