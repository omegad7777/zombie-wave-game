import * as THREE from 'three';

/**
 * Procedural Canvas Texture Generators
 * Ensures zero external 404 dependencies and high retro-FPS visual fidelity
 */

export function createStoneWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark stone background
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Brick rows
  const rows = 8;
  const cols = 4;
  const rowH = 512 / rows;
  const colW = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const isShifted = r % 2 === 1;
    const shift = isShifted ? colW / 2 : 0;
    for (let c = -1; c <= cols; c++) {
      const bx = c * colW + shift;
      const by = r * rowH;

      // Base brick color variation
      const shade = Math.floor(40 + Math.random() * 25);
      const tone = Math.random() > 0.5 ? 5 : -5;
      ctx.fillStyle = `rgb(${shade + tone}, ${shade}, ${shade + 4})`;
      ctx.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);

      // Noise on brick
      for (let n = 0; n < 80; n++) {
        const nx = bx + 4 + Math.random() * (colW - 8);
        const ny = by + 4 + Math.random() * (rowH - 8);
        const alpha = 0.05 + Math.random() * 0.12;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        ctx.fillRect(nx, ny, 2 + Math.random() * 4, 2 + Math.random() * 4);
      }
    }
  }

  // Grime and drips
  for (let d = 0; d < 6; d++) {
    const dx = Math.random() * 512;
    const grad = ctx.createLinearGradient(dx, 0, dx, 150 + Math.random() * 250);
    grad.addColorStop(0, 'rgba(10, 15, 10, 0.4)');
    grad.addColorStop(1, 'rgba(10, 15, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(dx - 15, 0, 30, 400);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Concrete grid with blood/grime
  ctx.fillStyle = '#181a1d';
  ctx.fillRect(0, 0, 512, 512);

  // Large tiles
  const tileSize = 128;
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      const shade = 28 + Math.floor(Math.random() * 12);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Cracks
      if (Math.random() > 0.6) {
        ctx.strokeStyle = '#0d0e10';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 20);
        ctx.lineTo(x + 60, y + 50);
        ctx.lineTo(x + 100, y + 90);
        ctx.stroke();
      }
    }
  }

  // Mortar lines
  ctx.strokeStyle = '#0b0c0d';
  ctx.lineWidth = 4;
  for (let x = 0; x <= 512; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWoodPlankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Base wood brown
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(0, 0, 256, 64);

  // Wood grain streaks
  for (let y = 0; y < 64; y += 3) {
    const grainColor = Math.random() > 0.5 ? '#432814' : '#6f4728';
    ctx.fillStyle = grainColor;
    ctx.fillRect(0, y, 256, 1 + Math.random() * 2);
  }

  // Splinters and knots
  for (let i = 0; i < 4; i++) {
    const kx = 30 + Math.random() * 190;
    const ky = 15 + Math.random() * 34;
    ctx.fillStyle = '#2f190a';
    ctx.beginPath();
    ctx.ellipse(kx, ky, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nails on both sides
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(14, 32, 4, 0, Math.PI * 2);
  ctx.arc(242, 32, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#777';
  ctx.beginPath();
  ctx.arc(13, 31, 2, 0, Math.PI * 2);
  ctx.arc(241, 31, 2, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createChalkOutlineTexture(weaponName: string, cost: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  // Chalk border & gun silhouette
  ctx.strokeStyle = 'rgba(235, 235, 220, 0.85)';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 4]);

  ctx.strokeRect(20, 20, 472, 216);

  // Weapon silhouette drawing
  ctx.beginPath();
  ctx.setLineDash([]);
  ctx.lineWidth = 5;
  if (weaponName.includes('Shotgun') || weaponName.includes('Remington')) {
    // Shotgun profile
    ctx.moveTo(80, 140);
    ctx.lineTo(130, 140);
    ctx.lineTo(150, 120);
    ctx.lineTo(420, 120);
    ctx.lineTo(420, 135);
    ctx.lineTo(240, 135);
    ctx.lineTo(210, 160);
    ctx.lineTo(160, 160);
    ctx.lineTo(120, 175);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Assault rifle profile
    ctx.moveTo(80, 145);
    ctx.lineTo(140, 145);
    ctx.lineTo(160, 115);
    ctx.lineTo(410, 115);
    ctx.lineTo(410, 130);
    ctx.lineTo(260, 130);
    ctx.lineTo(240, 170); // magazine
    ctx.lineTo(220, 165);
    ctx.lineTo(235, 130);
    ctx.lineTo(170, 155); // grip
    ctx.lineTo(150, 155);
    ctx.closePath();
    ctx.stroke();
  }

  // Chalk text
  ctx.fillStyle = 'rgba(255, 245, 220, 0.95)';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(weaponName.toUpperCase(), 256, 75);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`[E] BUY [${cost} PTS]`, 256, 205);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMysteryBoxQuestionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark mysterious aged wood with glowing runes
  ctx.fillStyle = '#2c1e13';
  ctx.fillRect(0, 0, 256, 256);

  // Metal corner brackets
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillRect(216, 0, 40, 40);
  ctx.fillRect(0, 216, 40, 40);
  ctx.fillRect(216, 216, 40, 40);

  // Question marks "? ?" in eerie blue/gold glow
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 110px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 90, 128);
  ctx.fillText('?', 166, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
