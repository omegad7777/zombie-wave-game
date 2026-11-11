import * as THREE from 'three';
import { WeaponDef, WeaponId } from './types';

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDef> = {
  colt: {
    id: 'colt',
    name: 'M1911 Colt',
    category: 'Pistol',
    damage: 35,
    fireRate: 4.0, // max click rate
    magazineSize: 8,
    maxReserve: 32,
    reloadTime: 1.3,
    pellets: 1,
    spread: 0.015,
    range: 60,
    automatic: false,
    cost: 0,
    ammoCost: 0,
    color: '#9ca3af',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Remington 870',
    category: 'Shotgun',
    damage: 28, // x 8 pellets = 224 max close damage
    fireRate: 1.2,
    magazineSize: 6,
    maxReserve: 36,
    reloadTime: 2.2,
    pellets: 8,
    spread: 0.075,
    range: 40,
    automatic: false,
    cost: 1000,
    ammoCost: 500,
    color: '#fbbf24',
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    category: 'Rifle',
    damage: 65,
    fireRate: 9.0, // rapid auto fire
    magazineSize: 30,
    maxReserve: 120,
    reloadTime: 1.9,
    pellets: 1,
    spread: 0.028,
    range: 80,
    automatic: true,
    cost: 1200,
    ammoCost: 600,
    color: '#f87171',
  },
  raygun: {
    id: 'raygun',
    name: 'Ray Gun',
    category: 'Wonder Weapon',
    damage: 320,
    fireRate: 3.5,
    magazineSize: 20,
    maxReserve: 160,
    reloadTime: 2.2,
    pellets: 1,
    spread: 0.008,
    range: 100,
    automatic: false,
    cost: 950, // Mystery box
    ammoCost: 4500,
    color: '#34d399',
  },
};

/**
 * Builds a detailed procedural 3D weapon viewmodel
 */
export function buildWeaponMesh(id: WeaponId): THREE.Group {
  const group = new THREE.Group();

  if (id === 'colt') {
    // 1911 Pistol
    const slideMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.25,
      metalness: 0.85,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
      metalness: 0.1,
    });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.32), slideMat);
    slide.position.set(0, 0.05, -0.06);
    group.add(slide);

    // Barrel tip
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 12), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.24);
    group.add(barrel);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.09), gripMat);
    grip.position.set(0, -0.06, 0.04);
    grip.rotation.x = -0.22;
    group.add(grip);

    // Trigger guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.07), slideMat);
    guard.position.set(0, -0.01, -0.03);
    group.add(guard);
  } else if (id === 'shotgun') {
    // Trench / Remington Shotgun
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.35,
      metalness: 0.8,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x54290e,
      roughness: 0.5,
      metalness: 0.1,
    });
    const pumpMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.45,
      metalness: 0.15,
    });

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.3), metalMat);
    receiver.position.set(0, 0.02, 0);
    group.add(receiver);

    // Long Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.45);
    group.add(barrel);

    // Magazine tube underneath
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 12), metalMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, 0.01, -0.42);
    group.add(magTube);

    // Pump slide
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 12), pumpMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, 0.01, -0.38);
    group.add(pump);

    // Wood Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.13, 0.35), woodMat);
    stock.position.set(0, -0.06, 0.28);
    stock.rotation.x = 0.12;
    group.add(stock);
  } else if (id === 'ak47') {
    // Assault Rifle
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x1e2022,
      roughness: 0.3,
      metalness: 0.85,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x853b16,
      roughness: 0.45,
      metalness: 0.1,
    });

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.34), darkMetal);
    receiver.position.set(0, 0.03, -0.04);
    group.add(receiver);

    // Barrel & gas tube
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 12), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.045, -0.46);
    group.add(barrel);

    // Wood Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 0.24), woodMat);
    handguard.position.set(0, 0.045, -0.32);
    group.add(handguard);

    // Curved Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.09), darkMetal);
    mag.position.set(0, -0.09, -0.08);
    mag.rotation.x = -0.35;
    group.add(mag);

    // Pistol grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.065), woodMat);
    grip.position.set(0, -0.08, 0.08);
    grip.rotation.x = -0.3;
    group.add(grip);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.36), woodMat);
    stock.position.set(0, -0.02, 0.28);
    group.add(stock);
  } else if (id === 'raygun') {
    // CoD Zombies Ray Gun
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Crimson red
      roughness: 0.2,
      metalness: 0.7,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.9,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x34d399, // Glowing emerald green
    });

    // Bulbous retro main chamber
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.28, 16), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.04, -0.05);
    group.add(body);

    // Dial ring / meter on top
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16), goldMat);
    dial.position.set(0, 0.11, -0.03);
    group.add(dial);

    const dialGlass = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), glowMat);
    dialGlass.rotation.x = -Math.PI / 2;
    dialGlass.position.set(0, 0.125, -0.03);
    group.add(dialGlass);

    // Dual prong emitter barrel
    const prongL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.24, 8), goldMat);
    prongL.rotation.x = Math.PI / 2;
    prongL.position.set(-0.035, 0.04, -0.28);
    group.add(prongL);

    const prongR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.24, 8), goldMat);
    prongR.rotation.x = Math.PI / 2;
    prongR.position.set(0.035, 0.04, -0.28);
    group.add(prongR);

    // Center plasma node
    const plasmaNode = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), glowMat);
    plasmaNode.position.set(0, 0.04, -0.26);
    group.add(plasmaNode);

    // Futuristic Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.08), goldMat);
    grip.position.set(0, -0.08, 0.07);
    grip.rotation.x = -0.3;
    group.add(grip);

    // Glowing energy side tubes
    const tubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), glowMat);
    tubeL.rotation.x = Math.PI / 2;
    tubeL.position.set(-0.065, 0.03, -0.05);
    group.add(tubeL);

    const tubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), glowMat);
    tubeR.rotation.x = Math.PI / 2;
    tubeR.position.set(0.065, 0.03, -0.05);
    group.add(tubeR);
  }

  // Cast shadow disabled for viewmodel to prevent self-shading artifacts
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  return group;
}
