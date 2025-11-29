
import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { WIN_SCORE } from './constants';
import { GameMode, CharacterType } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'MENU' | 'CHARACTER_SELECT' | 'DIFFICULTY_SELECT' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER'>('MENU');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CPU);
  const [selectionStage, setSelectionStage] = useState<'P1' | 'P2' | 'NONE'>('NONE');
  
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  
  // Character Choices
  const [p1Character, setP1Character] = useState<CharacterType>(CharacterType.TRIANGLE);
  const [p2Character, setP2Character] = useState<CharacterType>(CharacterType.PENTAGON);

  // AI Difficulty (1-10)
  const [aiDifficulty, setAiDifficulty] = useState<number>(3);

  const [roundWinner, setRoundWinner] = useState<number | null>(null);
  const [matchWinner, setMatchWinner] = useState<number | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleStart = (mode: GameMode) => {
    setGameMode(mode);
    setGameState('CHARACTER_SELECT');
    setSelectionStage('P1');
  };

  const handleCharacterSelect = (type: CharacterType) => {
      if (selectionStage === 'P1') {
          setP1Character(type);
          setSelectionStage('P2');
      } else if (selectionStage === 'P2') {
          setP2Character(type);
          
          if (gameMode === GameMode.CPU) {
              setGameState('DIFFICULTY_SELECT');
          } else {
              startGame();
          }
      }
  };

  const handleDifficultySelect = (level: number) => {
      setAiDifficulty(level);
      startGame();
  };

  const startGame = () => {
    setP1Score(0);
    setP2Score(0);
    setGameState('PLAYING');
    setSelectionStage('NONE');
    setResetTrigger(prev => prev + 1);
  };

  const handleRoundEnd = (winnerId: number) => {
    setRoundWinner(winnerId);
    
    // Update Score
    if (winnerId === 1) {
        const newScore = p1Score + 1;
        setP1Score(newScore);
        if (newScore >= WIN_SCORE) {
            setMatchWinner(1);
            setGameState('GAME_OVER');
            return;
        }
    } else {
        const newScore = p2Score + 1;
        setP2Score(newScore);
        if (newScore >= WIN_SCORE) {
            setMatchWinner(2);
            setGameState('GAME_OVER');
            return;
        }
    }

    // Delay showing round over menu slightly for slow mo effect to finish
    setTimeout(() => {
        setGameState('ROUND_OVER');
    }, 800);
  };

  const nextRound = () => {
    setGameState('PLAYING');
    setResetTrigger(prev => prev + 1);
    setRoundWinner(null);
  };

  const restartGame = () => {
      setGameState('MENU');
      setP1Score(0);
      setP2Score(0);
  };

  return (
    <div className="w-screen h-screen bg-neutral-900 relative overflow-hidden flex items-center justify-center">
      {/* Scanline Overlay */}
      <div className="scanlines"></div>
      <div className="flicker w-full h-full absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black/30 z-40"></div>
      
      {/* Main Game Container */}
      <div className="w-full h-full max-w-[1400px] max-h-[900px] relative bg-black shadow-2xl overflow-hidden rounded-lg border-x-4 border-zinc-800">
        
        <GameCanvas 
            gameActive={gameState === 'PLAYING' || gameState === 'ROUND_OVER'} 
            onScoreUpdate={() => {}} 
            onRoundEnd={handleRoundEnd}
            resetTrigger={resetTrigger}
            gameMode={gameMode}
            p1Type={p1Character}
            p2Type={p2Character}
            p1Score={p1Score}
            p2Score={p2Score}
            aiDifficulty={aiDifficulty}
        />

        <UIOverlay 
            p1Score={p1Score}
            p2Score={p2Score}
            gameState={gameState}
            gameMode={gameMode}
            roundWinner={roundWinner}
            matchWinner={matchWinner}
            onStart={handleStart}
            onCharacterSelect={handleCharacterSelect}
            onDifficultySelect={handleDifficultySelect}
            selectionStage={selectionStage}
            onNextRound={nextRound}
            onRestart={restartGame}
            aiDifficulty={aiDifficulty}
        />
        
      </div>
    </div>
  );
};

export default App;
