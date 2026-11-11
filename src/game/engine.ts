import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sound } from './audio';
import { buildGameMap, MapData } from './map';
import { WEAPON_DEFINITIONS, buildWeaponMesh } from './weapons';
import { spawnZombie, ZombieInstance } from './zombie';
import { GameStats, PlayerInventory, WeaponId } from './types';

export interface EngineCallbacks {
  onStatsChange: (stats: GameStats) => void;
  onInventoryChange: (inv: PlayerInventory) => void;
  onHealthChange: (hp: number, maxHp: number) => void;
  onPromptChange: (prompt: string | null) => void;
  onHitmarker: (isKill: boolean, isHeadshot: boolean) => void;
  onFloatingText: (text: string, color: string) => void;
  onGameOver: (stats: GameStats) => void;
  onRoundChange: (round: number) => void;
}

export class ZombieGameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;

  // Three.js Core
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private animFrameId: number = 0;
  private isSoftwareGl: boolean = false;

  // Viewmodel & Weapon
  private weaponRig: THREE.Group;
  private currentWeaponMesh: THREE.Group | null = null;
  private muzzleFlashLight: THREE.PointLight;
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleFlashTimer: number = 0;
  private recoilPitch: number = 0;
  private recoilOffsetZ: number = 0;
  private reloadProgress: number = 0;
  private isReloading: boolean = false;
  private isSwapping: boolean = false;
  private swapTimer: number = 0;
  private nextWeaponIndex: number = 0;
  private shootCooldown: number = 0;
  private weaponBobTime: number = 0;

  // Player State
  public hp: number = 100;
  public maxHp: number = 100;
  private regenTimer: number = 0;
  public isDead: boolean = false;
  public isPaused: boolean = false;
  private position: THREE.Vector3 = new THREE.Vector3(0, 1.75, 0);
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  private cameraPitch: number = 0;
  private cameraYaw: number = 0;

  // Inventory & Stats
  public stats: GameStats = {
    points: 500, // CoD standard 500 starting points
    round: 1,
    kills: 0,
    headshots: 0,
    barricadesRepaired: 0,
    doorsOpened: 0,
    downCount: 0,
    timeSurvived: 0,
  };

  public inventory: PlayerInventory = {
    weapons: [
      {
        id: 'colt',
        currentAmmo: 8,
        reserveAmmo: 32,
      },
    ],
    activeWeaponIndex: 0,
  };

  // Map & World
  private mapData!: MapData;

  // Zombies & Wave State
  private zombies: ZombieInstance[] = [];
  private zombiesToSpawnInWave: number = 6;
  private zombiesSpawnedInWave: number = 0;
  private waveSpawnInterval: number = 2.2;
  private waveSpawnTimer: number = 0;
  private waveIntermissionTimer: number = 0;
  private isIntermission: boolean = false;
  private barricadeRepairTimer: number = 0;
  private roundRepairPointsEarned: number = 0;

  // Mystery Box State
  private mysteryBoxState: 'idle' | 'spinning' | 'ready' = 'idle';
  private mysteryBoxSpinTimer: number = 0;
  private mysteryBoxReadyTimer: number = 0;
  private mysteryBoxWeaponResult: WeaponId | null = null;
  private mysteryBoxFloatItem: THREE.Group | null = null;

  // Input State
  private keys: Record<string, boolean> = {};
  private isMouseDown: boolean = false;
  private isLocked: boolean = false;

  // Visual Effects & Particles
  private particles: {
    mesh: THREE.Points;
    velocities: Float32Array;
    lifetime: number;
    maxLifetime: number;
  }[] = [];

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // Check Software GL probe
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // Init Scene, Camera, Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08090b);
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.038);

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.1, 120);
    this.camera.position.copy(this.position);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Studio Reflection Environment
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('RoomEnvironment fallback', e);
    }

    // Viewmodel rig (child of camera)
    this.weaponRig = new THREE.Group();
    this.weaponRig.position.set(0.24, -0.22, -0.45);
    this.camera.add(this.weaponRig);
    this.scene.add(this.camera);

    // Muzzle Flash
    this.muzzleFlashLight = new THREE.PointLight(0xffedd5, 0, 8);
    this.muzzleFlashLight.position.set(0, 0.05, -0.4);
    this.weaponRig.add(this.muzzleFlashLight);

    const flashGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.position.set(0, 0.05, -0.4);
    this.muzzleFlashMesh.visible = false;
    this.weaponRig.add(this.muzzleFlashMesh);

    // Build World Map
    this.mapData = buildGameMap();
    this.scene.add(this.mapData.sceneGroup);

    // Load initial weapon mesh
    this.updateWeaponMesh();

    // Setup Event Listeners
    this.setupInputs();

    // Start round 1
    this.startRound(1);

    // Notify UI of initial states
    this.callbacks.onInventoryChange(this.inventory);
    this.callbacks.onStatsChange(this.stats);
    this.callbacks.onHealthChange(this.hp, this.maxHp);

    // Run animation loop
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private setupInputs() {
    // Pointer lock on canvas click
    this.container.addEventListener('click', () => {
      if (!this.isLocked && !this.isDead) {
        this.container.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.container;
    });

    // Mouse Move Look
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || this.isDead || this.isPaused) return;
      const sensitivity = 0.0022;
      this.cameraYaw -= e.movementX * sensitivity;
      this.cameraPitch -= e.movementY * sensitivity;
      this.cameraPitch = Math.max(-1.45, Math.min(1.45, this.cameraPitch));
    });

    // Mouse Down (Fire)
    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked || this.isDead || this.isPaused) return;
      if (e.button === 0) {
        this.isMouseDown = true;
        this.tryShoot();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    // Key Down
    document.addEventListener('keydown', (e) => {
      if (this.isDead) return;
      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        this.tryReload();
      }
      if (e.code === 'Digit1') {
        this.switchWeapon(0);
      }
      if (e.code === 'Digit2') {
        this.switchWeapon(1);
      }
      if (e.code === 'Digit3') {
        this.switchWeapon(2);
      }
      if (e.code === 'KeyE') {
        this.handleInteraction();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse Wheel weapon switch
    document.addEventListener('wheel', (e) => {
      if (!this.isLocked || this.isDead || this.isPaused) return;
      if (this.inventory.weapons.length > 1) {
        const next = (this.inventory.activeWeaponIndex + (e.deltaY > 0 ? 1 : -1) + this.inventory.weapons.length) % this.inventory.weapons.length;
        this.switchWeapon(next);
      }
    });

    // Window Resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Active Weapon Helpers
  public getActiveWeapon(): { id: WeaponId; currentAmmo: number; reserveAmmo: number } {
    return this.inventory.weapons[this.inventory.activeWeaponIndex];
  }

  private updateWeaponMesh() {
    if (this.currentWeaponMesh) {
      this.weaponRig.remove(this.currentWeaponMesh);
    }
    const active = this.getActiveWeapon();
    this.currentWeaponMesh = buildWeaponMesh(active.id);
    this.weaponRig.add(this.currentWeaponMesh);
  }

  public switchWeapon(index: number) {
    if (index === this.inventory.activeWeaponIndex || index >= this.inventory.weapons.length || this.isSwapping) return;
    this.isSwapping = true;
    this.isReloading = false;
    this.swapTimer = 0.35;
    this.nextWeaponIndex = index;
    sound.playMechanicalClick(0.6);
  }

  // Shooting System
  private tryShoot() {
    if (this.isReloading || this.isSwapping || this.shootCooldown > 0 || this.isDead) return;
    const active = this.getActiveWeapon();
    const def = WEAPON_DEFINITIONS[active.id];

    if (active.currentAmmo <= 0) {
      sound.playEmptyClick();
      this.tryReload();
      return;
    }

    // Deduct ammo
    active.currentAmmo--;
    this.shootCooldown = 1 / def.fireRate;
    this.callbacks.onInventoryChange(this.inventory);

    // Audio
    sound.playShoot(active.id);

    // Viewmodel Recoil & Muzzle Flash
    this.recoilPitch = def.category === 'Shotgun' ? 0.12 : 0.06;
    this.recoilOffsetZ = def.category === 'Shotgun' ? 0.08 : 0.04;
    this.muzzleFlashTimer = 0.06;
    this.muzzleFlashLight.intensity = active.id === 'raygun' ? 3.0 : 4.5;
    this.muzzleFlashLight.color.setHex(active.id === 'raygun' ? 0x34d399 : 0xffedd5);
    this.muzzleFlashMesh.visible = true;

    // Raycast / Bullet Trajectory
    const raycaster = new THREE.Raycaster();
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    // Ray Gun special handling: explosive plasma blast
    if (active.id === 'raygun') {
      this.fireRaygunBolt(camDir);
      return;
    }

    // Pellets loop (1 for bullet, 8 for shotgun)
    for (let p = 0; p < def.pellets; p++) {
      const spreadX = (Math.random() - 0.5) * def.spread;
      const spreadY = (Math.random() - 0.5) * def.spread;

      const screenPos = new THREE.Vector2(spreadX * 2, spreadY * 2);
      raycaster.setFromCamera(screenPos, this.camera);

      // Collect potential zombie targets
      const targetMeshes: THREE.Object3D[] = [];
      this.zombies.forEach((z) => {
        if (!z.isDead) {
          targetMeshes.push(z.headMesh, z.bodyMesh, z.armL, z.armR, z.legL, z.legR);
        }
      });

      const hits = raycaster.intersectObjects(targetMeshes, true);
      if (hits.length > 0) {
        const hit = hits[0];
        const isHeadshot = Boolean(hit.object.userData?.isHead);

        // Find which zombie this object belongs to
        const hitZombie = this.zombies.find((z) => {
          let curr: THREE.Object3D | null = hit.object;
          while (curr) {
            if (curr === z.group) return true;
            curr = curr.parent;
          }
          return false;
        });

        if (hitZombie) {
          const dmg = isHeadshot ? def.damage * 2.5 : def.damage;
          this.damageZombie(hitZombie, dmg, isHeadshot, hit.point);
        }
      }
    }
  }

  // Ray Gun Projectile & Area Splash Explosion
  private fireRaygunBolt(direction: THREE.Vector3) {
    const raycaster = new THREE.Raycaster();
    raycaster.set(this.camera.position, direction);

    // Raycast against scene objects (walls, obstacles) and zombies
    const targetObjects: THREE.Object3D[] = [this.mapData.sceneGroup];
    this.zombies.forEach((z) => {
      if (!z.isDead) targetObjects.push(z.group);
    });

    const hits = raycaster.intersectObjects(targetObjects, true);
    const impactPoint = hits.length > 0 ? hits[0].point : this.camera.position.clone().add(direction.clone().multiplyScalar(50));

    // Create glowing plasma blast visual
    this.createExplosionEffect(impactPoint, 0x34d399);
    sound.playExplosion();

    // Damage all zombies within 3.5m radius
    const splashRadius = 3.8;
    this.zombies.forEach((z) => {
      if (z.isDead) return;
      const dist = z.group.position.distanceTo(impactPoint);
      if (dist <= splashRadius) {
        const falloff = 1 - dist / splashRadius;
        const splashDmg = Math.floor(320 * Math.max(0.3, falloff));
        this.damageZombie(z, splashDmg, false, impactPoint);
      }
    });
  }

  // Damage Zombie Logic
  private damageZombie(zombie: ZombieInstance, damage: number, isHeadshot: boolean, hitPoint?: THREE.Vector3) {
    if (zombie.isDead) return;

    zombie.hp -= damage;
    this.stats.points += 10; // +10 on hit

    // Blood particle splash
    if (hitPoint) {
      this.createBloodSplatter(hitPoint, isHeadshot);
    }

    if (zombie.hp <= 0) {
      zombie.isDead = true;
      this.stats.kills++;
      const killPoints = isHeadshot ? 100 : 60;
      this.stats.points += killPoints;
      if (isHeadshot) {
        this.stats.headshots++;
        this.callbacks.onFloatingText(`+${killPoints} HEADSHOT!`, '#f59e0b');
      } else {
        this.callbacks.onFloatingText(`+${killPoints}`, '#fbbf24');
      }

      sound.playHitmarker(isHeadshot);
      this.callbacks.onHitmarker(true, isHeadshot);

      // Zombie death collapse animation
      zombie.group.rotation.x = -Math.PI / 2.2;
      zombie.group.position.y = 0.2;
    } else {
      sound.playHitmarker(false);
      this.callbacks.onHitmarker(false, false);
      this.callbacks.onFloatingText('+10', '#e2e8f0');
    }

    this.callbacks.onStatsChange(this.stats);
  }

  // Reload System
  public tryReload() {
    if (this.isReloading || this.isSwapping || this.isDead) return;
    const active = this.getActiveWeapon();
    const def = WEAPON_DEFINITIONS[active.id];

    if (active.currentAmmo >= def.magazineSize || active.reserveAmmo <= 0) return;

    this.isReloading = true;
    this.reloadProgress = def.reloadTime;
    sound.playReload();
  }

  // Player Interaction (E / F keys)
  private handleInteraction() {
    const prompt = this.getInteractiveTarget();
    if (!prompt) return;

    // 1. Doors / Debris
    if (prompt.type === 'door') {
      const door = this.mapData.doors.find((d) => d.id === prompt.id);
      if (door && !door.isOpen) {
        if (this.stats.points >= door.cost) {
          this.stats.points -= door.cost;
          this.stats.doorsOpened++;
          door.isOpen = true;
          sound.playPurchase();

          // Remove door collider and animate mesh away
          const index = this.mapData.colliders.indexOf(door.bounds);
          if (index > -1) this.mapData.colliders.splice(index, 1);

          const mesh = this.mapData.doorMeshes.get(door.id);
          if (mesh) {
            mesh.position.y = -10; // move down under floor
          }

          this.callbacks.onFloatingText(`DOOR UNLOCKED -${door.cost} PTS`, '#38bdf8');
          this.callbacks.onStatsChange(this.stats);
        } else {
          sound.playDeny();
          this.callbacks.onFloatingText('NEED MORE POINTS', '#ef4444');
        }
      }
    }

    // 2. Wall Buys
    if (prompt.type === 'wallbuy') {
      const wb = this.mapData.wallBuys.find((w) => w.id === prompt.id);
      if (wb) {
        const hasWeapon = this.inventory.weapons.some((w) => w.id === wb.weaponId);
        if (!hasWeapon) {
          // Buy new weapon
          if (this.stats.points >= wb.cost) {
            this.stats.points -= wb.cost;
            const def = WEAPON_DEFINITIONS[wb.weaponId];
            this.inventory.weapons.push({
              id: wb.weaponId,
              currentAmmo: def.magazineSize,
              reserveAmmo: def.maxReserve,
            });
            this.inventory.activeWeaponIndex = this.inventory.weapons.length - 1;
            this.updateWeaponMesh();
            sound.playPurchase();
            sound.playMechanicalClick(0.9);
            this.callbacks.onFloatingText(`BOUGHT ${def.name.toUpperCase()}!`, '#34d399');
            this.callbacks.onStatsChange(this.stats);
            this.callbacks.onInventoryChange(this.inventory);
          } else {
            sound.playDeny();
            this.callbacks.onFloatingText('NEED MORE POINTS', '#ef4444');
          }
        } else {
          // Buy Ammo refill
          if (this.stats.points >= wb.ammoCost) {
            const wep = this.inventory.weapons.find((w) => w.id === wb.weaponId)!;
            const def = WEAPON_DEFINITIONS[wb.weaponId];
            this.stats.points -= wb.ammoCost;
            wep.reserveAmmo = def.maxReserve;
            sound.playPurchase();
            sound.playMechanicalClick(0.9);
            this.callbacks.onFloatingText(`MAX AMMO REFILLED!`, '#38bdf8');
            this.callbacks.onStatsChange(this.stats);
            this.callbacks.onInventoryChange(this.inventory);
          } else {
            sound.playDeny();
            this.callbacks.onFloatingText('NEED MORE POINTS', '#ef4444');
          }
        }
      }
    }

    // 3. Mystery Box
    if (prompt.type === 'mysterybox') {
      if (this.mysteryBoxState === 'idle') {
        if (this.stats.points >= this.mapData.mysteryBox.cost) {
          this.stats.points -= this.mapData.mysteryBox.cost;
          this.mysteryBoxState = 'spinning';
          this.mysteryBoxSpinTimer = 3.6;
          sound.playPurchase();
          sound.playMysteryBoxJingle();

          // Open lid & light beam
          this.mapData.mysteryBox.lid.rotation.x = -Math.PI / 2.4;
          (this.mapData.mysteryBox.lightBeam.material as THREE.MeshBasicMaterial).opacity = 0.65;
          this.mapData.mysteryBox.glowLight.intensity = 5.0;

          // Pick random weapon (weighted towards awesome weapons including Ray Gun)
          const pool: WeaponId[] = ['shotgun', 'ak47', 'raygun', 'colt', 'shotgun', 'ak47', 'raygun'];
          this.mysteryBoxWeaponResult = pool[Math.floor(Math.random() * pool.length)];

          // Create floating spinning preview model
          if (this.mysteryBoxFloatItem) {
            this.mapData.mysteryBox.group.remove(this.mysteryBoxFloatItem);
          }
          this.mysteryBoxFloatItem = buildWeaponMesh(this.mysteryBoxWeaponResult);
          this.mysteryBoxFloatItem.position.set(0, 1.2, 0);
          this.mysteryBoxFloatItem.scale.set(1.5, 1.5, 1.5);
          this.mapData.mysteryBox.group.add(this.mysteryBoxFloatItem);

          this.callbacks.onStatsChange(this.stats);
        } else {
          sound.playDeny();
          this.callbacks.onFloatingText('NEED MORE POINTS', '#ef4444');
        }
      } else if (this.mysteryBoxState === 'ready' && this.mysteryBoxWeaponResult) {
        // Take weapon from box!
        const resultId = this.mysteryBoxWeaponResult;
        const def = WEAPON_DEFINITIONS[resultId];
        sound.playPurchase();

        const existingIdx = this.inventory.weapons.findIndex((w) => w.id === resultId);
        if (existingIdx >= 0) {
          this.inventory.weapons[existingIdx].reserveAmmo = def.maxReserve;
          this.inventory.activeWeaponIndex = existingIdx;
        } else {
          // If already holding 2 weapons, replace active
          if (this.inventory.weapons.length >= 2) {
            this.inventory.weapons[this.inventory.activeWeaponIndex] = {
              id: resultId,
              currentAmmo: def.magazineSize,
              reserveAmmo: def.maxReserve,
            };
          } else {
            this.inventory.weapons.push({
              id: resultId,
              currentAmmo: def.magazineSize,
              reserveAmmo: def.maxReserve,
            });
            this.inventory.activeWeaponIndex = this.inventory.weapons.length - 1;
          }
        }

        this.updateWeaponMesh();
        this.closeMysteryBox();
        this.callbacks.onFloatingText(`ACQUIRED ${def.name.toUpperCase()}!`, '#34d399');
        this.callbacks.onInventoryChange(this.inventory);
      }
    }
  }

  private closeMysteryBox() {
    this.mysteryBoxState = 'idle';
    this.mysteryBoxSpinTimer = 0;
    this.mysteryBoxReadyTimer = 0;
    this.mysteryBoxWeaponResult = null;
    this.mapData.mysteryBox.lid.rotation.x = 0;
    (this.mapData.mysteryBox.lightBeam.material as THREE.MeshBasicMaterial).opacity = 0;
    this.mapData.mysteryBox.glowLight.intensity = 2.5;
    if (this.mysteryBoxFloatItem) {
      this.mapData.mysteryBox.group.remove(this.mysteryBoxFloatItem);
      this.mysteryBoxFloatItem = null;
    }
  }

  // Interactive Target Detection
  public getInteractiveTarget(): { type: 'door' | 'wallbuy' | 'barricade' | 'mysterybox'; id: string; text: string } | null {
    const maxInteractDist = 3.2;

    // Check Barricades (Repair with F or E)
    for (const b of this.mapData.barricades) {
      const dist = this.position.distanceTo(new THREE.Vector3(b.x, b.y, b.z));
      if (dist < maxInteractDist && b.planks < b.maxPlanks) {
        return {
          type: 'barricade',
          id: b.id,
          text: `[HOLD F] REPAIR BARRICADE (+10 PTS)`,
        };
      }
    }

    // Check Doors
    for (const d of this.mapData.doors) {
      if (!d.isOpen) {
        const dist = this.position.distanceTo(new THREE.Vector3(...d.position));
        if (dist < maxInteractDist) {
          return {
            type: 'door',
            id: d.id,
            text: `[E] ${d.name.toUpperCase()} [${d.cost} PTS]`,
          };
        }
      }
    }

    // Check Wall Buys
    for (const wb of this.mapData.wallBuys) {
      const dist = this.position.distanceTo(new THREE.Vector3(...wb.position));
      if (dist < maxInteractDist) {
        const has = this.inventory.weapons.some((w) => w.id === wb.weaponId);
        if (!has) {
          return {
            type: 'wallbuy',
            id: wb.id,
            text: `[E] BUY ${wb.title.toUpperCase()} [${wb.cost} PTS]`,
          };
        } else {
          return {
            type: 'wallbuy',
            id: wb.id,
            text: `[E] REFILL ${wb.title.toUpperCase()} AMMO [${wb.ammoCost} PTS]`,
          };
        }
      }
    }

    // Check Mystery Box
    const mbDist = this.position.distanceTo(new THREE.Vector3(...this.mapData.mysteryBox.position));
    if (mbDist < 3.5) {
      if (this.mysteryBoxState === 'idle') {
        return {
          type: 'mysterybox',
          id: 'mysterybox',
          text: `[E] MYSTERY BOX [${this.mapData.mysteryBox.cost} PTS]`,
        };
      } else if (this.mysteryBoxState === 'ready' && this.mysteryBoxWeaponResult) {
        const def = WEAPON_DEFINITIONS[this.mysteryBoxWeaponResult];
        return {
          type: 'mysterybox',
          id: 'mysterybox',
          text: `[E] TAKE ${def.name.toUpperCase()}`,
        };
      }
    }

    return null;
  }

  // Wave / Round System
  private startRound(roundNum: number) {
    this.stats.round = roundNum;
    this.roundRepairPointsEarned = 0;
    // Round 1: 5 zombies, Round 2: 8, Round 3: 13, Round 4: 18...
    this.zombiesToSpawnInWave = Math.floor(4 + roundNum * 3 + Math.pow(roundNum, 1.3) * 1.5);
    this.zombiesSpawnedInWave = 0;
    this.waveSpawnTimer = 1.0;
    this.isIntermission = false;

    sound.playRoundStart();
    this.callbacks.onRoundChange(roundNum);
    this.callbacks.onStatsChange(this.stats);
    this.callbacks.onFloatingText(`ROUND ${roundNum}`, '#ef4444');
  }

  private triggerRoundVictory() {
    this.isIntermission = true;
    this.waveIntermissionTimer = 6.0; // 6s breather
    sound.playRoundEnd();
    this.callbacks.onFloatingText('ROUND SURVIVED', '#f59e0b');
  }

  // Zombie Spawning
  private spawnNextZombie() {
    // Pick an active barricade window or exterior spawn
    // Only spawn at unlocked room barricades
    const availableBarricades = this.mapData.barricades.filter((b) => {
      // Courtyard barricades only if door_courtyard is open
      if (b.id.startsWith('courtyard')) {
        return this.mapData.doors.find((d) => d.id === 'door_courtyard')?.isOpen;
      }
      // Armory barricades only if door_armory is open
      if (b.id.startsWith('armory')) {
        return this.mapData.doors.find((d) => d.id === 'door_armory')?.isOpen;
      }
      return true; // Spawn room always open
    });

    if (availableBarricades.length === 0) return;
    const targetBarricade = availableBarricades[Math.floor(Math.random() * availableBarricades.length)];

    // Spawn 3.5m OUTSIDE the window
    let spawnX = targetBarricade.x;
    let spawnZ = targetBarricade.z;
    if (targetBarricade.rotationY === 0) {
      spawnZ += targetBarricade.z < 0 ? -3.5 : 3.5;
    } else {
      spawnX += targetBarricade.x < 0 ? -3.5 : 3.5;
    }

    const zombie = spawnZombie(spawnX, 0, spawnZ, this.stats.round, targetBarricade.id);
    this.zombies.push(zombie);
    this.scene.add(zombie.group);

    // Random growl occasionally
    if (Math.random() > 0.6) {
      sound.playZombieGrowl();
    }
  }

  // Particles
  private createBloodSplatter(position: THREE.Vector3, isHeadshot: boolean) {
    const count = isHeadshot ? 45 : 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities[i * 3] = (Math.random() - 0.5) * (isHeadshot ? 6 : 3.5);
      velocities[i * 3 + 1] = Math.random() * (isHeadshot ? 5 : 2.5);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * (isHeadshot ? 6 : 3.5);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x991b1b,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      lifetime: 0,
      maxLifetime: 0.55,
    });
  }

  private createExplosionEffect(position: THREE.Vector3, colorHex: number) {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.2) * speed;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.25,
      transparent: true,
      opacity: 1,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      lifetime: 0,
      maxLifetime: 0.65,
    });
  }

  // Barricade Repair Tick
  private updateBarricadeRepair(delta: number) {
    if (this.keys['KeyF'] || this.keys['KeyE']) {
      const interact = this.getInteractiveTarget();
      if (interact && interact.type === 'barricade') {
        this.barricadeRepairTimer += delta;
        if (this.barricadeRepairTimer >= 0.5) {
          this.barricadeRepairTimer = 0;
          const bar = this.mapData.barricades.find((b) => b.id === interact.id);
          const barMesh = this.mapData.barricadeMeshes.get(interact.id);
          if (bar && barMesh && bar.planks < bar.maxPlanks) {
            bar.planks++;
            // Re-show plank mesh
            barMesh.planks[bar.planks - 1].visible = true;
            sound.playBarricadeRepair();

            // +10 points per board (max 50 per round)
            if (this.roundRepairPointsEarned < 50) {
              this.stats.points += 10;
              this.roundRepairPointsEarned += 10;
              this.callbacks.onFloatingText('+10 REPAIR', '#38bdf8');
            }
            this.stats.barricadesRepaired++;
            this.callbacks.onStatsChange(this.stats);
          }
        }
      }
    } else {
      this.barricadeRepairTimer = 0;
    }
  }

  // Main Loop Tick
  private tick() {
    this.animFrameId = requestAnimationFrame(this.tick);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (this.isPaused) return;

    if (!this.isDead) {
      this.stats.timeSurvived += delta;
    }

    // 1. Automatic Weapon Fire (AK-47 rapid fire while holding LMB)
    if (this.isMouseDown && !this.isDead) {
      const active = this.getActiveWeapon();
      const def = WEAPON_DEFINITIONS[active.id];
      if (def.automatic) {
        this.tryShoot();
      }
    }

    // 2. Cooldowns
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    // Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashLight.intensity = 0;
        this.muzzleFlashMesh.visible = false;
      }
    }

    // Weapon swap animation
    if (this.isSwapping) {
      this.swapTimer -= delta;
      if (this.swapTimer <= 0) {
        this.isSwapping = false;
        this.inventory.activeWeaponIndex = this.nextWeaponIndex;
        this.updateWeaponMesh();
        this.callbacks.onInventoryChange(this.inventory);
      }
    }

    // Reload progress
    if (this.isReloading) {
      this.reloadProgress -= delta;
      if (this.reloadProgress <= 0) {
        this.isReloading = false;
        const active = this.getActiveWeapon();
        const def = WEAPON_DEFINITIONS[active.id];
        const needed = def.magazineSize - active.currentAmmo;
        const reloadAmount = Math.min(needed, active.reserveAmmo);
        active.currentAmmo += reloadAmount;
        active.reserveAmmo -= reloadAmount;
        this.callbacks.onInventoryChange(this.inventory);
      }
    }

    // 3. Player Movement & Physics
    if (!this.isDead) {
      this.updatePlayerMovement(delta);
    }

    // 4. Update Mystery Box
    this.updateMysteryBox(delta);

    // 5. Update Barricades & Interactive prompts
    this.updateBarricadeRepair(delta);
    const prompt = this.getInteractiveTarget();
    this.callbacks.onPromptChange(prompt ? prompt.text : null);

    // 6. Update Zombies & Wave
    this.updateZombies(delta);
    this.updateWave(delta);

    // 7. Update Particles
    this.updateParticles(delta);

    // 8. Player Health Regen
    if (!this.isDead && this.hp < this.maxHp) {
      this.regenTimer += delta;
      if (this.regenTimer >= 4.0) {
        this.hp = Math.min(this.maxHp, this.hp + 35 * delta);
        this.callbacks.onHealthChange(this.hp, this.maxHp);
      }
    }

    // 9. Camera & Viewmodel update
    this.updateCameraAndViewmodel(delta);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  // Player Physics & Collisions
  private updatePlayerMovement(delta: number) {
    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const baseSpeed = isSprinting ? 7.8 : 5.0;

    const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    const moveZ = (this.keys['KeyS'] ? 1 : 0) - (this.keys['KeyW'] ? 1 : 0);

    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

    const wishDir = new THREE.Vector3()
      .addScaledVector(right, moveX)
      .addScaledVector(forward, -moveZ);

    if (wishDir.lengthSq() > 0.001) {
      wishDir.normalize();
      this.velocity.x = wishDir.x * baseSpeed;
      this.velocity.z = wishDir.z * baseSpeed;
      this.weaponBobTime += delta * (isSprinting ? 14 : 9);
    } else {
      this.velocity.x *= 0.82;
      this.velocity.z *= 0.82;
    }

    // Jump & Gravity
    if (this.keys['Space'] && this.isGrounded) {
      this.velocity.y = 8.2;
      this.isGrounded = false;
    }

    this.velocity.y -= 25.0 * delta; // Gravity

    // Calculate tentative new position
    const nextX = this.position.x + this.velocity.x * delta;
    const nextZ = this.position.z + this.velocity.z * delta;
    const nextY = this.position.y + this.velocity.y * delta;

    // Check 2D Collisions against Map Colliders
    const playerRadius = 0.45;
    let allowedX = nextX;
    let allowedZ = nextZ;

    for (const box of this.mapData.colliders) {
      // Test X movement
      if (
        allowedX + playerRadius > box.minX &&
        allowedX - playerRadius < box.maxX &&
        this.position.z + playerRadius > box.minZ &&
        this.position.z - playerRadius < box.maxZ
      ) {
        allowedX = this.position.x;
      }
      // Test Z movement
      if (
        this.position.x + playerRadius > box.minX &&
        this.position.x - playerRadius < box.maxX &&
        allowedZ + playerRadius > box.minZ &&
        allowedZ - playerRadius < box.maxZ
      ) {
        allowedZ = this.position.z;
      }
    }

    this.position.x = allowedX;
    this.position.z = allowedZ;

    // Ground check
    if (nextY <= 1.75) {
      this.position.y = 1.75;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.position.y = nextY;
      this.isGrounded = false;
    }
  }

  // Camera & Viewmodel Animations
  private updateCameraAndViewmodel(delta: number) {
    // Camera Orientation
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraYaw;
    this.camera.rotation.x = this.cameraPitch;

    // Viewmodel Bobbing
    const bobOffset = Math.sin(this.weaponBobTime) * 0.015;
    const bobSide = Math.cos(this.weaponBobTime * 0.5) * 0.012;

    // Viewmodel Recoil Recovery
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 18, delta);
    this.recoilOffsetZ = THREE.MathUtils.damp(this.recoilOffsetZ, 0, 20, delta);

    // Swap / Reload downward translation
    const swapY = this.isSwapping ? -0.35 : 0;
    const reloadAngle = this.isReloading ? 0.35 : 0;

    this.weaponRig.position.set(0.24 + bobSide, -0.22 + bobOffset + swapY, -0.45 + this.recoilOffsetZ);
    this.weaponRig.rotation.x = this.recoilPitch + reloadAngle;
    this.weaponRig.rotation.y = bobSide * 0.5;
  }

  // Zombie AI, Navigation, Attacks & Animations
  private updateZombies(delta: number) {
    const playerPos = this.position;

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      if (z.isDead) {
        z.deathTimer += delta;
        // Fade out and remove after 6 seconds
        if (z.deathTimer >= 6.0) {
          this.scene.remove(z.group);
          this.zombies.splice(i, 1);
        }
        continue;
      }

      // Check Barricade Target
      if (!z.hasVaulted && z.targetBarricadeId) {
        const bar = this.mapData.barricades.find((b) => b.id === z.targetBarricadeId);
        const barMesh = this.mapData.barricadeMeshes.get(z.targetBarricadeId);

        if (bar && barMesh) {
          const barPos = new THREE.Vector3(bar.x, 0, bar.z);
          const distToBar = z.group.position.distanceTo(barPos);

          if (distToBar > 1.2 && bar.planks > 0) {
            // Walk towards barricade
            z.group.lookAt(barPos.x, z.group.position.y, barPos.z);
            z.group.translateZ(z.speed * delta);
          } else if (bar.planks > 0) {
            // Reached window: tear down boards
            z.tearCooldown -= delta;
            // Tear arm swing animation
            z.armL.rotation.x = -Math.PI / 2 + Math.sin(Date.now() * 0.01) * 0.4;
            z.armR.rotation.x = -Math.PI / 2 - Math.sin(Date.now() * 0.01) * 0.4;

            if (z.tearCooldown <= 0) {
              z.tearCooldown = 1.6;
              bar.planks--;
              barMesh.planks[bar.planks].visible = false;
              sound.playBarricadeBreak();
            }
          } else {
            // Barricade destroyed: vault into room!
            z.hasVaulted = true;
            // Move inside past the sill
            const vaultDir = new THREE.Vector3()
              .subVectors(playerPos, z.group.position)
              .normalize();
            z.group.position.addScaledVector(vaultDir, 1.8);
          }
        } else {
          z.hasVaulted = true;
        }
      } else {
        // Pursue Player
        const dir = new THREE.Vector3()
          .subVectors(playerPos, z.group.position);
        dir.y = 0;
        const distToPlayer = dir.length();

        z.group.lookAt(playerPos.x, z.group.position.y, playerPos.z);

        if (distToPlayer > 1.45) {
          // Walk towards player
          z.group.translateZ(z.speed * delta);
          z.walkCycle += delta * z.speed * 4.5;
          // Leg swinging
          z.legL.rotation.x = Math.sin(z.walkCycle) * 0.55;
          z.legR.rotation.x = -Math.sin(z.walkCycle) * 0.55;
          // Arms reaching forward with eerie sway
          z.armL.rotation.x = -Math.PI / 2.6 + Math.cos(z.walkCycle) * 0.15;
          z.armR.rotation.x = -Math.PI / 2.8 - Math.cos(z.walkCycle) * 0.15;
        } else {
          // Melee Attack Range
          z.attackCooldown -= delta;
          z.armL.rotation.x = -Math.PI / 2 + Math.sin(Date.now() * 0.015) * 0.7;
          z.armR.rotation.x = -Math.PI / 2 + Math.cos(Date.now() * 0.015) * 0.7;

          if (z.attackCooldown <= 0 && !this.isDead) {
            z.attackCooldown = 1.1; // 1.1s melee cooldown
            sound.playZombieAttack();
            sound.playPlayerHurt();
            this.hp = Math.max(0, this.hp - 35);
            this.regenTimer = 0;
            this.callbacks.onHealthChange(this.hp, this.maxHp);

            if (this.hp <= 0) {
              this.handlePlayerDeath();
            }
          }
        }
      }
    }
  }

  // Mystery Box Logic
  private updateMysteryBox(delta: number) {
    if (this.mysteryBoxState === 'spinning') {
      this.mysteryBoxSpinTimer -= delta;
      if (this.mysteryBoxFloatItem) {
        this.mysteryBoxFloatItem.rotation.y += delta * 12;
      }

      if (this.mysteryBoxSpinTimer <= 0) {
        this.mysteryBoxState = 'ready';
        this.mysteryBoxReadyTimer = 10.0; // 10s to pick up weapon
        sound.playMechanicalClick(0.9);
      }
    } else if (this.mysteryBoxState === 'ready') {
      this.mysteryBoxReadyTimer -= delta;
      if (this.mysteryBoxFloatItem) {
        this.mysteryBoxFloatItem.rotation.y += delta * 2.5;
        this.mysteryBoxFloatItem.position.y = 1.2 + Math.sin(Date.now() * 0.004) * 0.1;
      }

      if (this.mysteryBoxReadyTimer <= 0) {
        this.closeMysteryBox();
      }
    }
  }

  // Wave Management Loop
  private updateWave(delta: number) {
    if (this.isIntermission) {
      this.waveIntermissionTimer -= delta;
      if (this.waveIntermissionTimer <= 0) {
        this.startRound(this.stats.round + 1);
      }
      return;
    }

    // Spawn zombies
    if (this.zombiesSpawnedInWave < this.zombiesToSpawnInWave) {
      this.waveSpawnTimer -= delta;
      if (this.waveSpawnTimer <= 0) {
        this.waveSpawnTimer = Math.max(1.2, this.waveSpawnInterval - this.stats.round * 0.1);
        this.spawnNextZombie();
        this.zombiesSpawnedInWave++;
      }
    } else {
      // Check if all zombies in current wave are dead
      const aliveZombies = this.zombies.filter((z) => !z.isDead).length;
      if (aliveZombies === 0) {
        this.triggerRoundVictory();
      }
    }
  }

  // Particles Loop
  private updateParticles(delta: number) {
    for (let p = this.particles.length - 1; p >= 0; p--) {
      const part = this.particles[p];
      part.lifetime += delta;

      const posAttr = part.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3] += part.velocities[i * 3] * delta;
        posArray[i * 3 + 1] += part.velocities[i * 3 + 1] * delta;
        posArray[i * 3 + 2] += part.velocities[i * 3 + 2] * delta;
        part.velocities[i * 3 + 1] -= 9.8 * delta; // Gravity
      }
      posAttr.needsUpdate = true;

      (part.mesh.material as THREE.PointsMaterial).opacity = 1 - part.lifetime / part.maxLifetime;

      if (part.lifetime >= part.maxLifetime) {
        this.scene.remove(part.mesh);
        this.particles.splice(p, 1);
      }
    }
  }

  // Player Death / Game Over
  private handlePlayerDeath() {
    this.isDead = true;
    sound.playRoundEnd();
    document.exitPointerLock?.();
    this.callbacks.onGameOver(this.stats);
  }

  // Restart Game
  public restart() {
    this.hp = 100;
    this.isDead = false;
    this.stats = {
      points: 500,
      round: 1,
      kills: 0,
      headshots: 0,
      barricadesRepaired: 0,
      doorsOpened: 0,
      downCount: 0,
      timeSurvived: 0,
    };
    this.inventory = {
      weapons: [
        {
          id: 'colt',
          currentAmmo: 8,
          reserveAmmo: 32,
        },
      ],
      activeWeaponIndex: 0,
    };

    this.position.set(0, 1.75, 0);
    this.velocity.set(0, 0, 0);

    // Clean existing zombies
    this.zombies.forEach((z) => this.scene.remove(z.group));
    this.zombies = [];

    // Reset doors & colliders
    this.scene.remove(this.mapData.sceneGroup);
    this.mapData = buildGameMap();
    this.scene.add(this.mapData.sceneGroup);

    this.closeMysteryBox();
    this.updateWeaponMesh();

    this.callbacks.onInventoryChange(this.inventory);
    this.callbacks.onStatsChange(this.stats);
    this.callbacks.onHealthChange(this.hp, this.maxHp);

    this.startRound(1);
    this.container.requestPointerLock();
  }

  // Cleanup on unmount
  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
