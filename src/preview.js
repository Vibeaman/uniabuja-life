import * as THREE from 'three';
import { makeCharacter, applyCharacterAppearance } from './character.js';

// One reusable renderer, on demand; previews do not add another animation loop.
let renderer, avatarScene, avatar, avatarCamera;
export function renderPreview(container, scene, camera) {
  if (!container) return;
  renderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(Math.max(120, container.clientWidth), 190);
  renderer.setClearColor(0x0b1220, 1);
  renderer.domElement.setAttribute('aria-label', '3D preview');
  container.replaceChildren(renderer.domElement);
  renderer.render(scene, camera);
}
export function drawAvatarPreview(container, appearance, rotation = 0) {
  if (!avatarScene) {
    avatarScene = new THREE.Scene();
    avatarScene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 4, 5); avatarScene.add(light);
    avatar = makeCharacter(); avatarScene.add(avatar);
    avatarCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    avatarCamera.position.set(0, 1.4, 4.7); avatarCamera.lookAt(0, 1.2, 0);
  }
  applyCharacterAppearance(avatar, appearance);
  avatar.rotation.y = rotation;
  avatarCamera.aspect = Math.max(120, container.clientWidth) / 190;
  avatarCamera.updateProjectionMatrix();
  renderPreview(container, avatarScene, avatarCamera);
}
