import React from 'react';
import { GameStats, PlayerInventory, WeaponId } from '../game/types';
import { WEAPON_DEFINITIONS } from '../game/weapons';
import { Shield, Crosshair as CrosshairIcon, Volume2, VolumeX, Sparkles, Skull, Flame } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  inventory: PlayerInventory;
  hp: number;
  maxHp: number;
  prompt: string | null;
  hitmarker: { active: boolean; isKill: boolean; isHeadshot: boolean };
  floatingTexts: { id: string; text: string; color: string }[];
  isDead: boolean;
  isLocked: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
  onLockPointer: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  inventory,
  hp,
  maxHp,
  prompt,
  hitmarker,
  floatingTexts,
  isDead,
  isLocked,
  isMuted,
  onToggleMute,
  onRestart,
  onLockPointer,
}) => {
  const activeWeaponState = inventory.weapons[inventory.activeWeaponIndex] || inventory.weapons[0];
  const activeDef = WEAPON_DEFINITIONS[activeWeaponState.id as WeaponId] || WEAPON_DEFINITIONS.colt;

  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLowHp = hp < 35;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. Low Health Red Vignette */}
      {isLowHp && !isDead && (
        <div
          className="absolute inset-0 transition-opacity duration-300 animate-pulse pointer-events-none"
          style={{
            background: 'radial-gradient(circle, transparent 40%, rgba(185, 28, 28, 0.45) 85%, rgba(127, 29, 29, 0.8) 100%)',
          }}
        />
      )}

      {/* 2. Top-Right Round Counter (Classic Blood-Red Chalk) */}
      <div className="absolute top-6 right-8 flex flex-col items-end pointer-events-auto">
        <div className="flex items-center gap-2 text-red-600 drop-shadow-[0_2px_12px_rgba(220,38,38,0.8)]">
          <Skull className="w-8 h-8 text-red-600 animate-bounce" />
          <div className="text-4xl md:text-5xl font-extrabold tracking-widest font-mono text-red-500 uppercase">
            ROUND {stats.round}
          </div>
        </div>
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono mt-0.5">
          Wave Survival
        </div>
      </div>

      {/* Top Left: Game Title & Audio Toggle */}
      <div className="absolute top-6 left-8 flex items-center gap-4 pointer-events-auto">
        <div>
          <div className="text-lg md:text-xl font-black tracking-widest uppercase text-zinc-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span>Call of Undead</span>
            <span className="text-xs bg-red-900/80 border border-red-600 text-red-200 px-2 py-0.5 rounded font-mono">
              3D BLOCKADE
            </span>
          </div>
          <div className="text-xs text-zinc-400 tracking-wider">
            ZOMBIES SURVIVAL
          </div>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 rounded text-zinc-300 transition-colors pointer-events-auto flex items-center gap-1.5 text-xs font-mono"
          title="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'MUTED' : 'SFX ON'}</span>
        </button>
      </div>

      {/* 3. Center Screen: Crosshair, Hitmarker, and Interactive Prompts */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Crosshair */}
        {!isDead && (
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Crosshair lines */}
            <div className="absolute w-2.5 h-0.5 bg-zinc-100/85 -left-3" />
            <div className="absolute w-2.5 h-0.5 bg-zinc-100/85 -right-3" />
            <div className="absolute w-0.5 h-2.5 bg-zinc-100/85 -top-3" />
            <div className="absolute w-0.5 h-2.5 bg-zinc-100/85 -bottom-3" />
            <div className="w-1 h-1 bg-amber-400 rounded-full" />

            {/* Hitmarker (Diagonal X) */}
            {hitmarker.active && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-125 transition-transform">
                <div
                  className={`w-6 h-6 border-2 border-transparent relative ${
                    hitmarker.isHeadshot
                      ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,1)]'
                      : 'text-amber-300'
                  }`}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xl font-black">
                    ✕
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Prompt Banner */}
        {prompt && !isDead && (
          <div className="mt-12 bg-black/85 border-2 border-amber-500/80 text-amber-300 px-5 py-2.5 rounded shadow-2xl backdrop-blur-sm text-sm md:text-base font-bold font-mono tracking-wider animate-pulse flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{prompt}</span>
          </div>
        )}

        {/* Floating Scores */}
        <div className="absolute top-1/2 left-1/2 transform translate-x-12 -translate-y-16 flex flex-col items-start gap-1 pointer-events-none">
          {floatingTexts.map((item) => (
            <div
              key={item.id}
              style={{ color: item.color }}
              className="font-mono font-black text-lg md:text-xl tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce"
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Bottom-Left: Health & Points */}
      <div className="absolute bottom-6 left-8 flex flex-col gap-3 pointer-events-auto">
        {/* Points Display */}
        <div className="flex items-baseline gap-2 bg-black/70 border border-zinc-800 px-4 py-2 rounded backdrop-blur-sm">
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono">POINTS:</span>
          <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
            {stats.points.toLocaleString()}
          </span>
          <span className="text-xs text-amber-500 font-mono font-bold">PTS</span>
        </div>

        {/* Health Bar */}
        <div className="flex flex-col gap-1 w-56 md:w-64 bg-black/70 border border-zinc-800 p-2.5 rounded backdrop-blur-sm">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="flex items-center gap-1 text-zinc-300 font-bold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>VITALITY</span>
            </span>
            <span className={`${isLowHp ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-300'}`}>
              {Math.ceil(hp)} / {maxHp}
            </span>
          </div>

          <div className="w-full h-3 bg-zinc-950 rounded-sm overflow-hidden border border-zinc-800">
            <div
              className={`h-full transition-all duration-150 rounded-sm ${
                isLowHp
                  ? 'bg-red-600 animate-pulse'
                  : hpPercent < 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Bottom-Right: Active Weapon & Ammo */}
      <div className="absolute bottom-6 right-8 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Weapon Slots Swap Indicators */}
        <div className="flex gap-2 mb-1">
          {inventory.weapons.map((w, idx) => {
            const def = WEAPON_DEFINITIONS[w.id];
            const isActive = idx === inventory.activeWeaponIndex;
            return (
              <div
                key={idx}
                className={`px-2.5 py-1 text-xs font-mono rounded border flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-black/60 border-zinc-800 text-zinc-500'
                }`}
              >
                <span className="text-[10px] text-zinc-400">[{idx + 1}]</span>
                <span>{def.name}</span>
              </div>
            );
          })}
        </div>

        {/* Main Ammo Counter Card */}
        <div className="bg-black/80 border border-zinc-800 p-4 rounded min-w-[200px] text-right backdrop-blur-sm shadow-xl">
          <div className="text-xs uppercase tracking-widest text-zinc-400 font-mono mb-0.5">
            {activeDef.category}
          </div>
          <div
            className="text-xl md:text-2xl font-black uppercase tracking-wide truncate mb-1"
            style={{ color: activeDef.color }}
          >
            {activeDef.name}
          </div>

          <div className="flex items-baseline justify-end gap-2 font-mono">
            <span
              className={`text-4xl md:text-5xl font-black ${
                activeWeaponState.currentAmmo === 0
                  ? 'text-red-500 animate-pulse'
                  : 'text-zinc-100'
              }`}
            >
              {activeWeaponState.currentAmmo}
            </span>
            <span className="text-xl text-zinc-500 font-bold">/</span>
            <span className="text-xl md:text-2xl font-bold text-zinc-400">
              {activeWeaponState.reserveAmmo}
            </span>
          </div>

          {activeWeaponState.currentAmmo === 0 && activeWeaponState.reserveAmmo > 0 && (
            <div className="text-xs text-amber-400 font-mono font-bold mt-1 animate-pulse">
              [PRESS R TO RELOAD]
            </div>
          )}
        </div>
      </div>

      {/* 6. Click to Start / Unlock Overlay */}
      {!isLocked && !isDead && (
        <div
          onClick={onLockPointer}
          className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center pointer-events-auto cursor-pointer p-6 backdrop-blur-sm z-30"
        >
          <div className="max-w-xl text-center bg-zinc-950 border border-zinc-800 p-8 rounded-xl shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-black tracking-widest text-red-500 uppercase mb-2">
              Call of Undead
            </h1>
            <p className="text-sm md:text-base text-zinc-400 mb-6 font-mono">
              3D BLOCKADE • WAVE SURVIVAL FPS
            </p>

            <button
              onClick={onLockPointer}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black text-xl tracking-widest uppercase rounded shadow-lg shadow-red-950/60 transition-transform active:scale-95 mb-6 cursor-pointer"
            >
              CLICK TO ENTER COMBAT
            </button>

            {/* Quick Controls Guide */}
            <div className="grid grid-cols-2 gap-3 text-left bg-zinc-900/60 p-4 rounded border border-zinc-800 text-xs font-mono text-zinc-300">
              <div><span className="text-amber-400 font-bold">WASD:</span> Move</div>
              <div><span className="text-amber-400 font-bold">MOUSE:</span> Look & Aim</div>
              <div><span className="text-amber-400 font-bold">LEFT CLICK:</span> Fire Weapon</div>
              <div><span className="text-amber-400 font-bold">R:</span> Reload</div>
              <div><span className="text-amber-400 font-bold">SPACE / SHIFT:</span> Jump / Sprint</div>
              <div><span className="text-amber-400 font-bold">E / F:</span> Interact & Repair</div>
              <div><span className="text-amber-400 font-bold">1, 2 / SCROLL:</span> Switch Weapon</div>
              <div><span className="text-amber-400 font-bold">ESC:</span> Release Mouse</div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Game Over Screen */}
      {isDead && (
        <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center pointer-events-auto p-6 backdrop-blur-md z-40">
          <div className="max-w-md w-full bg-zinc-950 border-2 border-red-700 p-8 rounded-xl shadow-2xl text-center">
            <Skull className="w-16 h-16 text-red-600 mx-auto mb-3 animate-pulse" />
            <h2 className="text-5xl font-black tracking-widest text-red-600 uppercase mb-1">
              YOU DIED
            </h2>
            <p className="text-sm text-zinc-400 font-mono uppercase tracking-wider mb-6">
              Surviving the Undead Horde
            </p>

            {/* Stats Breakdown */}
            <div className="space-y-2.5 bg-zinc-900/80 p-4 rounded border border-zinc-800 text-left font-mono text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-zinc-400">SURVIVED TO:</span>
                <span className="text-red-400 font-bold">ROUND {stats.round}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">TOTAL KILLS:</span>
                <span className="text-zinc-200 font-bold">{stats.kills}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">HEADSHOTS:</span>
                <span className="text-amber-400 font-bold">{stats.headshots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">BOARDS REPAIRED:</span>
                <span className="text-zinc-200 font-bold">{stats.barricadesRepaired}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">DOORS OPENED:</span>
                <span className="text-zinc-200 font-bold">{stats.doorsOpened}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">TOTAL SCORE:</span>
                <span className="text-amber-400 font-black">{stats.points.toLocaleString()} PTS</span>
              </div>
            </div>

            <button
              onClick={onRestart}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-lg tracking-wider uppercase rounded shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
