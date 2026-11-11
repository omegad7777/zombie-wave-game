import * as THREE from 'three';
import { sound } from './audio';

export interface ZombieInstance {
  id: string;
  group: THREE.Group;
  headMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  eyesMesh: THREE.Mesh;

  hp: number;
  maxHp: number;
  speed: number;
  isDead: boolean;
  isAttacking: boolean;
  attackCooldown: number;
  tearCooldown: number;

  // Barricade target state
  targetBarricadeId: string | null;
  hasVaulted: boolean;

  // Animation timers
  walkCycle: number;
  deathTimer: number;
}

/**
 * Creates a procedural 8-part zombie character model with glowing yellow/red eyes
 */
export function createZombieModel(): {
  group: THREE.Group;
  headMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  eyesMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x475545, // Rotting grayish-green
    roughness: 0.8,
    metalness: 0.1,
  });
  const clothesMat = new THREE.MeshStandardMaterial({
    color: 0x27272a, // Tattered military / inmate rags
    roughness: 0.9,
    metalness: 0.05,
  });
  const eyesMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15, // Glowing sinister zombie eyes
  });

  // 1. Torso / Body (Primary silhouette)
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.75, 0.3);
  const bodyMesh = new THREE.Mesh(bodyGeo, clothesMat);
  bodyMesh.position.set(0, 1.25, 0);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 2. Head (with distinct headshot hit detection)
  const headGeo = new THREE.BoxGeometry(0.35, 0.38, 0.35);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 1.8, 0);
  headMesh.castShadow = true;
  headMesh.userData = { isHead: true };
  group.add(headMesh);

  // Glowing evil eyes on head
  const eyesGeo = new THREE.BoxGeometry(0.24, 0.05, 0.04);
  const eyesMesh = new THREE.Mesh(eyesGeo, eyesMat);
  eyesMesh.position.set(0, 1.84, 0.18);
  group.add(eyesMesh);

  // 3. Left Arm (shoulder pivot)
  const armL = new THREE.Group();
  armL.position.set(-0.38, 1.55, 0);
  const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), skinMat);
  armLMesh.position.set(0, -0.35, 0);
  armLMesh.castShadow = true;
  armL.add(armLMesh);
  // Default forward reach
  armL.rotation.x = -Math.PI / 2.6;
  group.add(armL);

  // 4. Right Arm (shoulder pivot)
  const armR = new THREE.Group();
  armR.position.set(0.38, 1.55, 0);
  const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), skinMat);
  armRMesh.position.set(0, -0.35, 0);
  armRMesh.castShadow = true;
  armR.add(armRMesh);
  armR.rotation.x = -Math.PI / 2.8;
  group.add(armR);

  // 5. Left Leg (hip pivot)
  const legL = new THREE.Group();
  legL.position.set(-0.16, 0.88, 0);
  const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.88, 0.2), clothesMat);
  legLMesh.position.set(0, -0.44, 0);
  legLMesh.castShadow = true;
  legL.add(legLMesh);
  group.add(legL);

  // 6. Right Leg (hip pivot)
  const legR = new THREE.Group();
  legR.position.set(0.16, 0.88, 0);
  const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.88, 0.2), clothesMat);
  legRMesh.position.set(0, -0.44, 0);
  legRMesh.castShadow = true;
  legR.add(legRMesh);
  group.add(legR);

  return {
    group,
    headMesh,
    bodyMesh,
    armL,
    armR,
    legL,
    legR,
    eyesMesh,
  };
}

let zombieCounter = 0;

export function spawnZombie(
  x: number,
  y: number,
  z: number,
  round: number,
  barricadeId: string | null = null,
): ZombieInstance {
  zombieCounter++;
  const { group, headMesh, bodyMesh, armL, armR, legL, legR, eyesMesh } = createZombieModel();
  group.position.set(x, y, z);

  // Health and speed scaling with round
  // Round 1: 100 HP, Round 2: 160 HP, Round 3: 230 HP...
  const hp = Math.floor(90 + (round - 1) * 65 + Math.pow(round, 1.25) * 15);

  // Speed: Shamblers early, sprinters late
  const baseSpeed = 1.6 + Math.min(round * 0.25, 2.4);
  const speedVariation = (Math.random() - 0.5) * 0.4;
  const speed = Math.max(1.3, baseSpeed + speedVariation);

  return {
    id: `zombie_${zombieCounter}`,
    group,
    headMesh,
    bodyMesh,
    armL,
    armR,
    legL,
    legR,
    eyesMesh,
    hp,
    maxHp: hp,
    speed,
    isDead: false,
    isAttacking: false,
    attackCooldown: 0,
    tearCooldown: 1.5,
    targetBarricadeId: barricadeId,
    hasVaulted: barricadeId === null,
    walkCycle: Math.random() * Math.PI * 2,
    deathTimer: 0,
  };
}
