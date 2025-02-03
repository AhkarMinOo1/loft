import { WallManager } from '../wallManager.js';
import { SidebarManager } from './SidebarManager.js';
import { FileManager } from './FileManager.js';
import { DragManager } from './DragManager.js';
import { chair, table, sofa, roundTable } from '../asset.js';
import * as THREE from 'three';

export class UIManager {
    constructor(scene, floor, gridSize, camera, renderer, controls) {
        this.scene = scene;
        this.floor = floor;
        this.gridSize = gridSize;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.isRemoveMode = false;

        // Check if we're in view-only mode from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.isViewOnly = urlParams.get('mode') === 'view';

        // Initialize UI elements
        this.removeButton = document.getElementById('remove-object');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.switchDirectionButton = document.getElementById('switch-direction');

        // Initialize managers with proper parameters
        this.wallManager = new WallManager(
            this.scene,
            this.floor,
            this.gridSize,
            this.renderer
        );
        this.dragManager = new DragManager(this);
        this.sidebarManager = new SidebarManager(this);
        this.fileManager = new FileManager(this);

        // If view-only mode, load the specified scene
        const sceneId = urlParams.get('scene');
        if (sceneId && this.isViewOnly) {
            this.fileManager.loadScene(sceneId, true);
        }

        this.initializeUI();
        this.initializeEventListeners();
    }

    initializeUI() {
        if (this.removeButton) {
            this.removeButton.addEventListener('click', () => {
                this.toggleRemoveMode();
            });
        }

        if (this.switchDirectionButton) {
            this.switchDirectionButton.addEventListener('click', () => {
                this.wallManager.switchDirection();
            });
        }
    }

    initializeEventListeners() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousemove', (event) => {
            if (this.wallManager.isAddWallMode) {
                const raycaster = this.createRaycaster(event);
                const intersects = raycaster.intersectObject(this.floor);
                if (intersects.length > 0) {
                    this.wallManager.updatePreviewWall(intersects[0].point);
                }
            } else {
                this.dragManager.handleMouseMove(event);
            }
        });

        canvas.addEventListener('mousedown', (event) => {
            if (this.isRemoveMode) {
                this.handleRemoveObject(event);
            } else if (this.wallManager.isAddWallMode) {
                this.wallManager.handleMouseDown(event, this.camera);
            } else {
                this.dragManager.handleMouseDown(event);
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.dragManager.stopDragging();
        });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    createRaycaster(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        return raycaster;
    }

    handleRemoveObject(event) {
        const raycaster = this.createRaycaster(event);
        const intersects = raycaster.intersectObjects(this.scene.children, true);

        for (const intersect of intersects) {
            const object = this.findRemovableParent(intersect.object);
            if (object) {
                if (object.userData.isWall) {
                    const index = this.wallManager.walls.indexOf(object);
                    if (index !== -1) {
                        this.wallManager.walls.splice(index, 1);
                    }
                }
                this.scene.remove(object);
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
                break;
            }
        }
    }

    findRemovableParent(object) {
        let current = object;
        while (current) {
            if (current.userData && (current.userData.isMovable || current.userData.isWall)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    async createChair() {
        const chairModel = await chair(this.scene);
        if (chairModel) {
            chairModel.userData = {
                isChair: true,
                isMovable: true,
                isRotatable: true
            };
        }
        return chairModel;
    }

    async createTable() {
        const tableModel = await table(this.scene);
        if (tableModel) {
            tableModel.userData = {
                isFurniture: true,
                isMovable: true,
                isRotatable: true
            };
        }
        return tableModel;
    }

    async createSofa() {
        const sofaModel = await sofa(this.scene);
        if (sofaModel) {
            sofaModel.userData = {
                isSofa: true,
                isMovable: true,
                isRotatable: true
            };
        }
        return sofaModel;
    }

    async createRoundTable() {
        const roundTableModel = await roundTable(this.scene);
        if (roundTableModel) {
            roundTableModel.userData = {
                isTable: true,
                isMovable: true,
                isRotatable: true
            };
        }
        return roundTableModel;
    }

    toggleRemoveMode() {
        this.isRemoveMode = !this.isRemoveMode;
        this.removeButton.classList.toggle('active');
        document.body.classList.toggle('remove-mode');
        
        if (this.isRemoveMode) {
            this.wallManager.toggleAddWallMode(false);
        }
    }

    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.toggle('active', show);
        }
    }

    initScaleControls() {
        const scaleBtn = document.createElement('button');
        scaleBtn.className = 'toolbar-btn';
        scaleBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i> Size';
        scaleBtn.addEventListener('click', () => {
            this.toggleScaleMode(!this.dragManager.scaleMode);
        });
        document.querySelector('.toolbar').appendChild(scaleBtn);

        // Updated click handler
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('scale-panel');
            const isScaleRelated = panel.contains(e.target) || e.target === scaleBtn;
            
            if (!isScaleRelated) {
                this.toggleScaleMode(false);
                this.dragManager.hideScalePanel();
            }
        });
    }

    toggleScaleMode(enable) {
        this.dragManager.scaleMode = enable;
        this.renderer.domElement.style.cursor = enable ? 'pointer' : 'default';
        if (!enable) this.dragManager.hideScalePanel();
    }
}