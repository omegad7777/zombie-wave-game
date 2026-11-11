/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ZombieGameEngine } from './game/engine';
import { HUD } from './components/HUD';
import { GameStats, PlayerInventory } from './game/types';
import { sound } from './game/audio';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ZombieGameEngine | null>(null);

  const [stats, setStats] = useState<GameStats>({
    points: 500,
    round: 1,
    kills: 0,
    headshots: 0,
    barricadesRepaired: 0,
    doorsOpened: 0,
    downCount: 0,
    timeSurvived: 0,
  });

  const [inventory, setInventory] = useState<PlayerInventory>({
    weapons: [
      {
        id: 'colt',
        currentAmmo: 8,
        reserveAmmo: 32,
      },
    ],
    activeWeaponIndex: 0,
  });

  const [hp, setHp] = useState<number>(100);
  const [maxHp] = useState<number>(100);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isDead, setIsDead] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [hitmarker, setHitmarker] = useState<{ active: boolean; isKill: boolean; isHeadshot: boolean }>({
    active: false,
    isKill: false,
    isHeadshot: false,
  });

  const [floatingTexts, setFloatingTexts] = useState<{ id: string; text: string; color: string }[]>([]);

  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new ZombieGameEngine(canvasMountRef.current, {
      onStatsChange: (newStats) => setStats({ ...newStats }),
      onInventoryChange: (newInv) => setInventory({ ...newInv, weapons: [...newInv.weapons] }),
      onHealthChange: (newHp) => setHp(newHp),
      onPromptChange: (newPrompt) => setPrompt(newPrompt),
      onHitmarker: (isKill, isHeadshot) => {
        setHitmarker({ active: true, isKill, isHeadshot });
        setTimeout(() => {
          setHitmarker((prev) => ({ ...prev, active: false }));
        }, 110);
      },
      onFloatingText: (text, color) => {
        const id = `${Date.now()}_${Math.random()}`;
        setFloatingTexts((prev) => [...prev.slice(-4), { id, text, color }]);
        setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
        }, 1200);
      },
      onGameOver: (finalStats) => {
        setStats({ ...finalStats });
        setIsDead(true);
      },
      onRoundChange: (newRound) => {
        setStats((prev) => ({ ...prev, round: newRound }));
      },
    });

    engineRef.current = engine;

    const handleLockChange = () => {
      const locked = document.pointerLockElement === canvasMountRef.current;
      setIsLocked(locked);
    };

    document.addEventListener('pointerlockchange', handleLockChange);

    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleRestart = () => {
    setIsDead(false);
    engineRef.current?.restart();
  };

  const handleLockPointer = () => {
    if (canvasMountRef.current && !isDead) {
      canvasMountRef.current.requestPointerLock();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMute(nextMuted);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-crosshair focus:outline-none"
        tabIndex={0}
      />

      {/* Retro CoD Zombies HUD & Overlays */}
      <HUD
        stats={stats}
        inventory={inventory}
        hp={hp}
        maxHp={maxHp}
        prompt={prompt}
        hitmarker={hitmarker}
        floatingTexts={floatingTexts}
        isDead={isDead}
        isLocked={isLocked}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onRestart={handleRestart}
        onLockPointer={handleLockPointer}
      />
    </div>
  );
}
