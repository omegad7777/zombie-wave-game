export type WeaponId = 'colt' | 'shotgun' | 'ak47' | 'raygun';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  category: 'Pistol' | 'Shotgun' | 'Rifle' | 'Wonder Weapon';
  damage: number;
  fireRate: number; // shots per second
  magazineSize: number;
  maxReserve: number;
  reloadTime: number; // in seconds
  pellets: number; // 1 for bullet, 8 for shotgun
  spread: number; // bullet deviation
  range: number;
  automatic: boolean;
  cost: number;
  ammoCost: number;
  color: string;
}

export interface PlayerInventory {
  weapons: {
    id: WeaponId;
    currentAmmo: number;
    reserveAmmo: number;
  }[];
  activeWeaponIndex: number;
}

export interface BarricadeState {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  planks: number; // 0 to 5
  maxPlanks: number;
  roomName: string;
}

export interface DoorObstacle {
  id: string;
  name: string;
  cost: number;
  isOpen: boolean;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  position: [number, number, number];
  size: [number, number, number];
}

export interface WallBuy {
  id: string;
  weaponId: WeaponId;
  cost: number;
  ammoCost: number;
  position: [number, number, number];
  rotationY: number;
  title: string;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
}

export interface GameStats {
  points: number;
  round: number;
  kills: number;
  headshots: number;
  barricadesRepaired: number;
  doorsOpened: number;
  downCount: number;
  timeSurvived: number; // in seconds
}
