
import React, { useEffect } from 'react';
import { WIN_SCORE, TRIANGLE_STATS, PENTAGON_STATS, SQUARE_STATS, DIAMOND_STATS } from '../constants';
import { GameMode, CharacterType } from '../types';

interface UIOverlayProps {
  p1Score: number;
  p2Score: number;
  gameState: 'MENU' | 'CHARACTER_SELECT' | 'DIFFICULTY_SELECT' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER';
  gameMode: GameMode;
  roundWinner: number | null;
  matchWinner: number | null;
  onStart: (mode: GameMode) => void;
  onCharacterSelect: (type: CharacterType) => void;
  onDifficultySelect: (level: number) => void;
  selectionStage: 'P1' | 'P2' | 'NONE';
  onNextRound: () => void;
  onRestart: () => void;
  aiDifficulty: number;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  p1Score,
  p2Score,
  gameState,
  gameMode,
  roundWinner,
  matchWinner,
  onStart,
  onCharacterSelect,
  onDifficultySelect,
  selectionStage,
  onNextRound,
  onRestart,
  aiDifficulty
}) => {

  // Keyboard navigation for menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState === 'MENU') {
            if (e.code === 'Digit1') onStart(GameMode.CPU);
            if (e.code === 'Digit2') onStart(GameMode.PVP);
        } else if (gameState === 'ROUND_OVER') {
            if (e.code === 'Space' || e.code === 'Enter') onNextRound();
        } else if (gameState === 'GAME_OVER') {
            if (e.code === 'Space' || e.code === 'Enter') onRestart();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, onStart, onNextRound, onRestart]);
  
  // Character List
  const characters = [
      { type: CharacterType.TRIANGLE, stats: TRIANGLE_STATS },
      { type: CharacterType.SQUARE, stats: SQUARE_STATS },
      { type: CharacterType.PENTAGON, stats: PENTAGON_STATS },
      { type: CharacterType.DIAMOND, stats: DIAMOND_STATS },
  ];

  const getDifficultyTitle = (level: number) => {
      if (level <= 3) return { text: "ROOKIE", color: "text-green-400" };
      if (level <= 6) return { text: "WARRIOR", color: "text-yellow-400" };
      if (level <= 9) return { text: "MASTER", color: "text-orange-500" };
      return { text: "SINGULARITY", color: "text-red-500 font-black animate-pulse" };
  };

  if (gameState === 'MENU') {
    return (
      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8 animate-pulse italic tracking-tighter">
          NEON DIVE
        </h1>
        <div className="text-center space-y-4 mb-12 text-zinc-400">
           <p className="text-xl">VECTOR VENGEANCE EDITION</p>
           <div className="flex gap-12 mt-8 text-left bg-zinc-900/50 p-6 rounded-xl border border-zinc-700">
              <div>
                <h3 className="text-cyan-400 font-bold mb-2">PLAYER 1 (Keys)</h3>
                <p>Jump: <span className="text-white font-mono bg-zinc-800 px-2 rounded">S</span></p>
                <p>Dive: <span className="text-white font-mono bg-zinc-800 px-2 rounded">D</span></p>
              </div>
              <div className="w-px bg-zinc-700"></div>
              <div>
                <h3 className="text-fuchsia-400 font-bold mb-2">PLAYER 2 (Keys)</h3>
                <p>Jump: <span className="text-white font-mono bg-zinc-800 px-2 rounded">K</span></p>
                <p>Dive: <span className="text-white font-mono bg-zinc-800 px-2 rounded">L</span></p>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col gap-4">
            <button 
              onClick={() => onStart(GameMode.CPU)}
              className="px-12 py-4 bg-transparent border-2 border-cyan-400 text-cyan-400 font-black text-2xl hover:bg-cyan-400 hover:text-black transition-all skew-x-[-10deg] group"
            >
              <span className="inline-block group-hover:skew-x-[10deg]">1 PLAYER <span className="text-sm opacity-70">(VS CPU)</span></span>
            </button>
            <button 
              onClick={() => onStart(GameMode.PVP)}
              className="px-12 py-4 bg-transparent border-2 border-fuchsia-500 text-fuchsia-500 font-black text-2xl hover:bg-fuchsia-500 hover:text-black transition-all skew-x-[-10deg] group"
            >
              <span className="inline-block group-hover:skew-x-[10deg]">2 PLAYERS <span className="text-sm opacity-70">(PVP)</span></span>
            </button>
        </div>
      </div>
    );
  }

  if (gameState === 'CHARACTER_SELECT') {
      const isP1 = selectionStage === 'P1';
      const title = isP1 ? 'SELECT PLAYER 1' : (gameMode === GameMode.CPU ? 'SELECT OPPONENT' : 'SELECT PLAYER 2');
      const accentColor = isP1 ? 'text-cyan-400 border-cyan-400' : 'text-fuchsia-500 border-fuchsia-500';

      return (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 backdrop-blur-md">
            <h2 className={`text-4xl font-bold mb-8 ${isP1 ? 'text-cyan-400' : 'text-fuchsia-500'} animate-pulse`}>
                {title}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl w-full px-8">
                {characters.map((char) => (
                    <button 
                        key={char.type}
                        onClick={() => onCharacterSelect(char.type)}
                        className={`group relative p-4 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 transition-all flex flex-col gap-2 rounded-lg text-left`}
                    >
                        <div className="h-32 w-full flex items-center justify-center bg-black/50 mb-2 border border-zinc-800 group-hover:border-zinc-500 transition-colors">
                            {/* Simple SVG Preview */}
                            <svg width="60" height="60" viewBox="-30 -30 60 60">
                                {char.type === CharacterType.TRIANGLE && <path d="M20,0 L-15,15 L-15,-15 Z" fill="none" stroke={char.stats.COLOR} strokeWidth="3" />}
                                {char.type === CharacterType.SQUARE && <rect x="-20" y="-20" width="40" height="40" fill="none" stroke={char.stats.COLOR} strokeWidth="3" />}
                                {char.type === CharacterType.PENTAGON && <path d="M25,0 L7.5,25 L-25,15 L-25,-15 L7.5,-25 Z" fill="none" stroke={char.stats.COLOR} strokeWidth="3" />}
                                {char.type === CharacterType.DIAMOND && <path d="M20,0 L-10,15 L-25,0 L-10,-15 Z" fill="none" stroke={char.stats.COLOR} strokeWidth="3" />}
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-cyan-300">{char.stats.NAME}</h3>
                        <p className="text-xs text-zinc-400 h-8">{char.stats.DESC}</p>
                        
                        <div className="mt-2 space-y-1">
                            <StatBar label="SPD" value={char.stats.ATTRIBUTES.SPEED} color={char.stats.COLOR} />
                            <StatBar label="JMP" value={char.stats.ATTRIBUTES.JUMP} color={char.stats.COLOR} />
                            <StatBar label="WGT" value={char.stats.ATTRIBUTES.WEIGHT} color={char.stats.COLOR} />
                        </div>
                    </button>
                ))}
            </div>
            <div className="mt-8 text-zinc-500 text-sm">
                CLICK TO SELECT
            </div>
        </div>
      );
  }

  if (gameState === 'DIFFICULTY_SELECT') {
      const levels = Array.from({length: 10}, (_, i) => i + 1);
      
      return (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 backdrop-blur-md">
            <h2 className="text-4xl font-bold mb-12 text-white">CPU DIFFICULTY</h2>
            
            <div className="grid grid-cols-5 gap-4 max-w-4xl w-full px-8">
                {levels.map(level => {
                    const info = getDifficultyTitle(level);
                    return (
                        <button
                            key={level}
                            onClick={() => onDifficultySelect(level)}
                            className="aspect-square flex flex-col items-center justify-center border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-white hover:scale-105 transition-all group"
                        >
                            <span className={`text-4xl font-black mb-2 ${info.color}`}>{level}</span>
                            <span className="text-[10px] md:text-xs text-zinc-500 group-hover:text-white font-mono text-center px-1">{info.text}</span>
                        </button>
                    );
                })}
            </div>
        </div>
      );
  }

  const difficultyInfo = getDifficultyTitle(aiDifficulty);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8">
      {/* Scoreboard */}
      <div className="flex justify-between items-start">
         <div className="flex flex-col items-start">
            <h2 className="text-cyan-400 font-bold text-2xl mb-1">P1 // PLAYER</h2>
            <div className="flex gap-2">
                {Array.from({length: WIN_SCORE}).map((_, i) => (
                    <div key={i} className={`w-8 h-4 skew-x-[-20deg] border border-cyan-500 ${i < p1Score ? 'bg-cyan-400 shadow-[0_0_10px_#00ffff]' : 'bg-transparent'}`} />
                ))}
            </div>
         </div>

         <div className="text-6xl font-black text-zinc-800 tracking-widest select-none">VS</div>

         <div className="flex flex-col items-end">
            <h2 className="text-fuchsia-400 font-bold text-2xl mb-1 flex items-center gap-2">
                {gameMode === GameMode.CPU ? (
                    <>
                        <span>CPU</span>
                        <span className={`text-[10px] font-mono border border-current px-1.5 py-0.5 rounded opacity-80 ${difficultyInfo.color}`}>
                           LVL {aiDifficulty} {difficultyInfo.text}
                        </span>
                    </>
                ) : 'P2 // PLAYER'}
            </h2>
            <div className="flex gap-2 flex-row-reverse">
                {Array.from({length: WIN_SCORE}).map((_, i) => (
                    <div key={i} className={`w-8 h-4 skew-x-[20deg] border border-fuchsia-500 ${i < p2Score ? 'bg-fuchsia-400 shadow-[0_0_10px_#ff00ff]' : 'bg-transparent'}`} />
                ))}
            </div>
         </div>
      </div>

      {/* Round/Game Over Messages */}
      {(gameState === 'ROUND_OVER' || gameState === 'GAME_OVER') && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in zoom-in duration-300">
            {gameState === 'GAME_OVER' ? (
                <>
                    <h2 className={`text-8xl font-black mb-4 italic ${matchWinner === 1 ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
                        {matchWinner === 1 ? 'P1 WINS' : (gameMode === GameMode.CPU ? 'CPU WINS' : 'P2 WINS')}
                    </h2>
                    <p className="text-white text-xl mb-8 tracking-widest">VICTORY SECURED</p>
                    <button 
                        onClick={onRestart}
                        className="px-8 py-3 bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
                    >
                        PLAY AGAIN <span className="text-sm font-normal ml-2 opacity-50">[SPACE]</span>
                    </button>
                </>
            ) : (
                <>
                    <h2 className={`text-6xl font-black mb-4 ${roundWinner === 1 ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
                        ROUND {roundWinner === 1 ? 'P1' : (gameMode === GameMode.CPU ? 'CPU' : 'P2')}
                    </h2>
                    <button 
                        onClick={onNextRound}
                        className="px-8 py-3 border-2 border-white text-white font-bold hover:bg-white hover:text-black transition-colors"
                    >
                        NEXT ROUND <span className="text-sm font-normal ml-2 opacity-50">[SPACE]</span>
                    </button>
                </>
            )}
         </div>
      )}
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className="flex items-center gap-2 text-[10px] font-mono">
        <span className="w-6 text-zinc-500">{label}</span>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
                className="h-full rounded-full" 
                style={{ width: `${value * 10}%`, backgroundColor: color }}
            />
        </div>
    </div>
);
