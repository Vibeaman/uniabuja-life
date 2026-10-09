import * as THREE from 'three';

const textures = new Map();
// Original procedural motifs inspired by these fabrics, not scanned textiles.
export function fabricTexture(pattern) {
  if (!pattern) return null;
  if (textures.has(pattern)) return textures.get(pattern);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  if (pattern === 'ankara') {
    g.fillStyle = '#e87924'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) {
      g.fillStyle = '#312e81'; g.beginPath(); g.moveTo(x + 16, y + 2); g.lineTo(x + 30, y + 16); g.lineTo(x + 16, y + 30); g.lineTo(x + 2, y + 16); g.closePath(); g.fill();
      g.fillStyle = '#fde68a'; g.beginPath(); g.arc(x + 16, y + 16, 5, 0, Math.PI * 2); g.fill();
    }
  } else if (pattern === 'adire') {
    g.fillStyle = '#312e81'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#bfdbfe'; g.lineWidth = 3;
    for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) {
      g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.stroke();
    }
  } else {
    g.fillStyle = '#9f1239'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 16) {
      g.fillStyle = '#fbbf24'; g.fillRect(x, 0, 4, 128);
      g.fillStyle = '#fef3c7'; g.fillRect(x + 6, 0, 2, 128);
    }
    g.fillStyle = 'rgba(255,255,255,.16)';
    for (let y = 0; y < 128; y += 8) g.fillRect(0, y, 128, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  textures.set(pattern, texture);
  return texture;
}
