import * as THREE from 'three';
import {
  createStoneWallTexture,
  createFloorTexture,
  createWoodPlankTexture,
  createChalkOutlineTexture,
  createMysteryBoxQuestionTexture,
} from './textures';
import { BarricadeState, DoorObstacle, WallBuy } from './types';

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MapData {
  sceneGroup: THREE.Group;
  colliders: BoundingBox2D[];
  doors: DoorObstacle[];
  doorMeshes: Map<string, THREE.Group>;
  barricades: BarricadeState[];
  barricadeMeshes: Map<string, { group: THREE.Group; planks: THREE.Mesh[] }>;
  wallBuys: WallBuy[];
  mysteryBox: {
    group: THREE.Group;
    lid: THREE.Mesh;
    boxBase: THREE.Mesh;
    lightBeam: THREE.Mesh;
    glowLight: THREE.PointLight;
    position: [number, number, number];
    cost: number;
  };
}

export function buildGameMap(): MapData {
  const sceneGroup = new THREE.Group();
  const colliders: BoundingBox2D[] = [];
  const doorMeshes = new Map<string, THREE.Group>();
  const barricadeMeshes = new Map<string, { group: THREE.Group; planks: THREE.Mesh[] }>();

  // Textures
  const wallTex = createStoneWallTexture();
  wallTex.repeat.set(4, 2);
  const floorTex = createFloorTexture();
  floorTex.repeat.set(8, 8);
  const plankTex = createWoodPlankTexture();

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.85,
    metalness: 0.1,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.8,
    metalness: 0.15,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    roughness: 0.9,
    metalness: 0.05,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: plankTex,
    roughness: 0.6,
    metalness: 0.1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.4,
    metalness: 0.8,
  });

  // Helper to add static wall + collider
  function addWall(x: number, y: number, z: number, w: number, h: number, d: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    sceneGroup.add(mesh);

    // Add 2D AABB collider with small padding
    colliders.push({
      minX: x - w / 2 - 0.35,
      maxX: x + w / 2 + 0.35,
      minZ: z - d / 2 - 0.35,
      maxZ: z + d / 2 + 0.35,
    });
    return mesh;
  }

  // 1. FLOORS & CEILINGS
  // Starting Room: X [-8, 8], Z [-8, 8]
  const spawnFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
  spawnFloor.rotation.x = -Math.PI / 2;
  spawnFloor.position.set(0, 0, 0);
  spawnFloor.receiveShadow = true;
  sceneGroup.add(spawnFloor);

  const spawnCeil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), ceilingMat);
  spawnCeil.rotation.x = Math.PI / 2;
  spawnCeil.position.set(0, 4.2, 0);
  sceneGroup.add(spawnCeil);

  // Courtyard Floor: X [-8, 8], Z [8, 26]
  const courtyardFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 18), floorMat);
  courtyardFloor.rotation.x = -Math.PI / 2;
  courtyardFloor.position.set(0, 0, 17);
  courtyardFloor.receiveShadow = true;
  sceneGroup.add(courtyardFloor);

  // Courtyard is open air (no ceiling, dramatic night sky fog)

  // Armory Floor: X [8, 24], Z [-8, 8]
  const armoryFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
  armoryFloor.rotation.x = -Math.PI / 2;
  armoryFloor.position.set(16, 0, 0);
  armoryFloor.receiveShadow = true;
  sceneGroup.add(armoryFloor);

  const armoryCeil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), ceilingMat);
  armoryCeil.rotation.x = Math.PI / 2;
  armoryCeil.position.set(16, 4.2, 0);
  sceneGroup.add(armoryCeil);

  // 2. WALLS & ROOM BOUNDARIES
  const wallH = 4.2;

  // --- STARTING ROOM WALLS ---
  // North Wall (with window in middle: X=-8 to -2.5, X=2.5 to 8)
  addWall(-5.25, wallH / 2, -8, 5.5, wallH, 0.6);
  addWall(5.25, wallH / 2, -8, 5.5, wallH, 0.6);
  // Lintel above north window
  const nLintel = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 0.6), wallMat);
  nLintel.position.set(0, 3.6, -8);
  sceneGroup.add(nLintel);
  const nSill = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.6), wallMat);
  nSill.position.set(0, 0.4, -8);
  sceneGroup.add(nSill);
  colliders.push({ minX: -2.5, maxX: 2.5, minZ: -8.5, maxZ: -7.5 });

  // West Wall (with window in middle: Z=-8 to -2.5, Z=2.5 to 8)
  addWall(-8, wallH / 2, -5.25, 0.6, wallH, 5.5);
  addWall(-8, wallH / 2, 5.25, 0.6, wallH, 5.5);
  // Lintel & sill
  const wLintel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 5), wallMat);
  wLintel.position.set(-8, 3.6, 0);
  sceneGroup.add(wLintel);
  const wSill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 5), wallMat);
  wSill.position.set(-8, 0.4, 0);
  sceneGroup.add(wSill);
  colliders.push({ minX: -8.5, maxX: -7.5, minZ: -2.5, maxZ: 2.5 });

  // South Wall (Separator between Spawn Room and Courtyard)
  // Has Door 1 in the middle: X=-8 to -2.5, X=2.5 to 8
  addWall(-5.25, wallH / 2, 8, 5.5, wallH, 0.6);
  addWall(5.25, wallH / 2, 8, 5.5, wallH, 0.6);
  const sLintel = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 0.6), wallMat);
  sLintel.position.set(0, 3.6, 8);
  sceneGroup.add(sLintel);

  // East Wall (Separator between Spawn Room and Armory)
  // Has Door 2 in the middle: Z=-8 to -2.5, Z=2.5 to 8
  addWall(8, wallH / 2, -5.25, 0.6, wallH, 5.5);
  addWall(8, wallH / 2, 5.25, 0.6, wallH, 5.5);
  const eLintel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 5), wallMat);
  eLintel.position.set(8, 3.6, 0);
  sceneGroup.add(eLintel);

  // --- COURTYARD WALLS ---
  // West Wall of Courtyard
  addWall(-8, wallH / 2, 13.5, 0.6, wallH, 11);
  addWall(-8, wallH / 2, 23.5, 0.6, wallH, 5);
  // Courtyard West window sill/lintel
  const cywLintel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 4), wallMat);
  cywLintel.position.set(-8, 3.6, 19);
  sceneGroup.add(cywLintel);
  const cywSill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 4), wallMat);
  cywSill.position.set(-8, 0.4, 19);
  sceneGroup.add(cywSill);
  colliders.push({ minX: -8.5, maxX: -7.5, minZ: 17, maxZ: 21 });

  // East Wall of Courtyard
  addWall(8, wallH / 2, 17, 0.6, wallH, 18);

  // South Wall / Perimeter Fence of Courtyard (with Barricade Gate)
  addWall(-5, wallH / 2, 26, 6, wallH, 0.6);
  addWall(5, wallH / 2, 26, 6, wallH, 0.6);
  const cysLintel = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.6), wallMat);
  cysLintel.position.set(0, 3.6, 26);
  sceneGroup.add(cysLintel);
  const cysSill = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 0.6), wallMat);
  cysSill.position.set(0, 0.3, 26);
  sceneGroup.add(cysSill);
  colliders.push({ minX: -2, maxX: 2, minZ: 25.5, maxZ: 26.5 });

  // Courtyard pillars & cover
  addWall(-3, 1.2, 14, 1.4, 2.4, 1.4);
  addWall(3, 1.2, 20, 1.4, 2.4, 1.4);

  // --- ARMORY WALLS ---
  // North Wall of Armory (with window)
  addWall(12, wallH / 2, -8, 8, wallH, 0.6);
  addWall(22, wallH / 2, -8, 4, wallH, 0.6);
  const anLintel = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.6), wallMat);
  anLintel.position.set(18, 3.6, -8);
  sceneGroup.add(anLintel);
  const anSill = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 0.6), wallMat);
  anSill.position.set(18, 0.4, -8);
  sceneGroup.add(anSill);
  colliders.push({ minX: 16, maxX: 20, minZ: -8.5, maxZ: -7.5 });

  // South Wall of Armory
  addWall(16, wallH / 2, 8, 16, wallH, 0.6);

  // East Wall of Armory (with window)
  addWall(24, wallH / 2, -5, 0.6, wallH, 6);
  addWall(24, wallH / 2, 5, 0.6, wallH, 6);
  const aeLintel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 4), wallMat);
  aeLintel.position.set(24, 3.6, 0);
  sceneGroup.add(aeLintel);
  const aeSill = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 4), wallMat);
  aeSill.position.set(24, 0.4, 0);
  sceneGroup.add(aeSill);
  colliders.push({ minX: 23.5, maxX: 24.5, minZ: -2, maxZ: 2 });

  // Armory tables / crates for cover
  addWall(16, 0.8, 0, 2.5, 1.6, 2.5);

  // 3. DOORS / DEBRIS (Interactive barriers)
  const doors: DoorObstacle[] = [
    {
      id: 'door_courtyard',
      name: 'Clear Debris to Courtyard',
      cost: 750,
      isOpen: false,
      bounds: { minX: -2.2, maxX: 2.2, minZ: 7.4, maxZ: 8.6 },
      position: [0, 1.5, 8],
      size: [4.4, 3.0, 0.8],
    },
    {
      id: 'door_armory',
      name: 'Unlock Armory Gate',
      cost: 1000,
      isOpen: false,
      bounds: { minX: 7.4, maxX: 8.6, minZ: -2.2, maxZ: 2.2 },
      position: [8, 1.5, 0],
      size: [0.8, 3.0, 4.4],
    },
  ];

  doors.forEach((door) => {
    // Add door collider initially
    colliders.push(door.bounds);

    // Create 3D door mesh (sandbags, wooden planks, and steel barricade bars)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(...door.position);

    // Main barricade mesh
    const baseDebris = new THREE.Mesh(
      new THREE.BoxGeometry(door.size[0], door.size[1], door.size[2]),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.7,
        metalness: 0.3,
      }),
    );
    doorGroup.add(baseDebris);

    // Diagonal warning boards
    for (let b = 0; b < 4; b++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(door.size[0] > 1 ? 4.2 : 0.2, 0.35, door.size[2] > 1 ? 4.2 : 0.2), woodMat);
      plank.position.set(0, -0.8 + b * 0.6, 0);
      plank.rotation.z = (b % 2 === 0 ? 0.15 : -0.15);
      doorGroup.add(plank);
    }

    sceneGroup.add(doorGroup);
    doorMeshes.set(door.id, doorGroup);
  });

  // 4. BARRICADE WINDOWS (Zombies spawn outside and tear planks, player repairs)
  const barricades: BarricadeState[] = [
    { id: 'spawn_north', x: 0, y: 1.8, z: -8, rotationY: 0, planks: 5, maxPlanks: 5, roomName: 'Starting Room (North)' },
    { id: 'spawn_west', x: -8, y: 1.8, z: 0, rotationY: Math.PI / 2, planks: 5, maxPlanks: 5, roomName: 'Starting Room (West)' },
    { id: 'courtyard_south', x: 0, y: 1.8, z: 26, rotationY: 0, planks: 5, maxPlanks: 5, roomName: 'Courtyard (South Fence)' },
    { id: 'courtyard_west', x: -8, y: 1.8, z: 19, rotationY: Math.PI / 2, planks: 5, maxPlanks: 5, roomName: 'Courtyard (West)' },
    { id: 'armory_north', x: 18, y: 1.8, z: -8, rotationY: 0, planks: 5, maxPlanks: 5, roomName: 'Armory (North)' },
    { id: 'armory_east', x: 24, y: 1.8, z: 0, rotationY: Math.PI / 2, planks: 5, maxPlanks: 5, roomName: 'Armory (East)' },
  ];

  barricades.forEach((barricade) => {
    const barGroup = new THREE.Group();
    barGroup.position.set(barricade.x, barricade.y, barricade.z);
    barGroup.rotation.y = barricade.rotationY;

    const plankMeshes: THREE.Mesh[] = [];

    // 5 horizontal wooden boards
    const boardOffsets = [-0.65, -0.32, 0.02, 0.34, 0.68];
    boardOffsets.forEach((offY, idx) => {
      const plankGeo = new THREE.BoxGeometry(3.6, 0.28, 0.08);
      const plankMesh = new THREE.Mesh(plankGeo, woodMat);
      plankMesh.position.set(0, offY, (idx % 2 === 0 ? 0.04 : -0.04));
      plankMesh.rotation.z = (idx % 2 === 0 ? 0.04 : -0.04) * (idx + 1);
      plankMesh.castShadow = true;
      barGroup.add(plankMesh);
      plankMeshes.push(plankMesh);
    });

    sceneGroup.add(barGroup);
    barricadeMeshes.set(barricade.id, { group: barGroup, planks: plankMeshes });
  });

  // 5. WALL BUYS (Shotgun in Spawn Room, AK-47 in Armory)
  const wallBuys: WallBuy[] = [
    {
      id: 'buy_shotgun',
      weaponId: 'shotgun',
      cost: 1000,
      ammoCost: 500,
      position: [7.65, 2.0, -4.5],
      rotationY: -Math.PI / 2,
      title: 'Remington 870',
    },
    {
      id: 'buy_ak47',
      weaponId: 'ak47',
      cost: 1200,
      ammoCost: 600,
      position: [14.0, 2.0, -7.65],
      rotationY: 0,
      title: 'AK-47',
    },
  ];

  wallBuys.forEach((wb) => {
    const chalkTex = createChalkOutlineTexture(wb.title, wb.cost);
    const chalkMat = new THREE.MeshBasicMaterial({
      map: chalkTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const chalkQuad = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), chalkMat);
    chalkQuad.position.set(...wb.position);
    chalkQuad.rotation.y = wb.rotationY;
    sceneGroup.add(chalkQuad);
  });

  // 6. MYSTERY BOX (Located in Courtyard at [0, 0.6, 21])
  const mbGroup = new THREE.Group();
  mbGroup.position.set(0, 0.6, 21);

  // Stone Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.9 }),
  );
  pedestal.position.set(0, -0.3, 0);
  mbGroup.add(pedestal);

  // Mystery Box Base
  const boxQuestionTex = createMysteryBoxQuestionTexture();
  const boxMat = new THREE.MeshStandardMaterial({
    map: boxQuestionTex,
    roughness: 0.5,
    metalness: 0.3,
  });

  const boxBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 1.1), boxMat);
  boxBase.position.set(0, 0.375, 0);
  boxBase.castShadow = true;
  mbGroup.add(boxBase);

  // Mystery Box Hinged Lid
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.18, 1.14), boxMat);
  lid.position.set(0, 0.84, 0);
  lid.castShadow = true;
  mbGroup.add(lid);

  // Mysterious ethereal blue glow light
  const glowLight = new THREE.PointLight(0x38bdf8, 2.5, 8);
  glowLight.position.set(0, 1.2, 0);
  mbGroup.add(glowLight);

  // Skyward beam when active (transparent cylinder)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const lightBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 25, 16), beamMat);
  lightBeam.position.set(0, 12.5, 0);
  mbGroup.add(lightBeam);

  sceneGroup.add(mbGroup);

  // Add Mystery Box collider
  colliders.push({ minX: -1.3, maxX: 1.3, minZ: 20.2, maxZ: 21.8 });

  // 7. LIGHTING RIG
  // Dark ambient/hemisphere for horror mood
  const hemiLight = new THREE.HemisphereLight(0x3b82f6, 0x1c1917, 0.3);
  sceneGroup.add(hemiLight);

  // Flickering orange/emergency red point lights in rooms
  const spawnLight = new THREE.PointLight(0xf59e0b, 2.0, 14);
  spawnLight.position.set(0, 3.8, 0);
  sceneGroup.add(spawnLight);

  // Hanging lantern mesh in spawn
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8), metalMat);
  lantern.position.set(0, 4.0, 0);
  sceneGroup.add(lantern);

  const armoryLight = new THREE.PointLight(0xef4444, 2.2, 14);
  armoryLight.position.set(16, 3.8, 0);
  sceneGroup.add(armoryLight);

  const courtyardLight = new THREE.PointLight(0x60a5fa, 1.8, 18);
  courtyardLight.position.set(0, 4.5, 17);
  sceneGroup.add(courtyardLight);

  return {
    sceneGroup,
    colliders,
    doors,
    doorMeshes,
    barricades,
    barricadeMeshes,
    wallBuys,
    mysteryBox: {
      group: mbGroup,
      lid,
      boxBase,
      lightBeam,
      glowLight,
      position: [0, 0.6, 21],
      cost: 950,
    },
  };
}
