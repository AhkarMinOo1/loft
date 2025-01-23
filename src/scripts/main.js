import { createScene, createFloor, initializeOrbitControls } from './floor.js';
import * as THREE from 'three';
import { UIManager } from './UIManager.js';

// Scene Setup
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('.main-content').appendChild(renderer.domElement);

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

// Scene Initialization
const scene = createScene();
const gridSize = 2; // Match this with your floor grid size
const floor = createFloor(20, 20, gridSize);
scene.add(floor);

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Controls Setup
const controls = initializeOrbitControls(camera, renderer);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Manager Initialization
const uiManager = new UIManager(
    scene,
    floor,  // Pass floor reference
    gridSize,
    camera,
    renderer,
    controls
);

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Window Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Prevent right-click menu
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());