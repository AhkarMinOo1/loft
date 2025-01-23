import { chair , table } from './asset.js';
import * as THREE from 'three';
import { WallManager } from './wallManager.js';

export class UIManager {
    constructor(scene, floor, gridSize, camera, renderer, controls) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.floor = floor;
        this.gridSize = gridSize;
        
        // State management
        this.isRemoveMode = false;
        this.isDragging = false;
        this.isRotating = false;
        this.selectedObject = null;
        this.offset = new THREE.Vector3();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.previousMousePosition = new THREE.Vector2();

        // Initialize subsystems
        this.wallManager = new WallManager(scene, floor, gridSize, renderer);

        // UI Elements
        this.sidebar = document.getElementById('sidebar');
        this.toggleButton = document.getElementById('sidebar-toggle');
        this.removeButton = document.getElementById('remove-object');

        // Initialize UI components
        this.initializeUI();
    }

    initializeUI() {
        this.sidebar.classList.remove('collapsed');
        this.initSidebarToggle();
        this.initObjectLibrary();
        this.initEventListeners();
    }

    initSidebarToggle() {
        this.toggleButton.addEventListener('click', () => this.toggleSidebar());
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
        const isCollapsed = this.sidebar.classList.contains('collapsed');
        this.toggleButton.style.left = isCollapsed ? '20px' : `calc(var(--sidebar-width) - 40px)`;
    }

    initObjectLibrary() {
        const libraryItems = [
            {
                name: 'Chair',
                thumbnail: 'assets/thumbnails/chair.jpg',
                action: async () => {
                    const chairModel = await chair(this.scene);
                    if (chairModel) {
                        chairModel.position.set(0, 0.5, 0);
                        chairModel.userData = {
                            isChair: true,
                            isMovable: true,
                            isRotatable: true
                        };
                    }
                }
            },
            {
                name: 'Table',
                thumbnail: 'assets/thumbnails/table.jpg', // Add table thumbnail
                action: async () => {
                    const tableModel = await table(this.scene);
                    if (tableModel) {
                        tableModel.position.set(0, 0.5, 0);
                        tableModel.userData = {
                            isFurniture: true,
                            isMovable: true,
                            isRotatable: true
                        };
                    }
                }
            },
            {
                name: 'Wall',
                thumbnail: 'assets/thumbnails/wall.jpg',
                action: () => {
                    this.wallManager.toggleAddWallMode();
                    this.isRemoveMode = false;
                    this.removeButton.classList.remove('remove-active');
                    document.body.classList.remove('remove-mode');
                }
            }
        ];

        const container = document.getElementById('library-items');
        libraryItems.forEach(item => {
            const button = document.createElement('button');
            button.className = 'object-btn';
            button.innerHTML = `
                <img src="${item.thumbnail}" alt="${item.name}">
                <span>${item.name}</span>
            `;
            button.addEventListener('click', item.action);
            container.appendChild(button);
        });
    }

    initEventListeners() {
        // Remove mode toggle
        this.removeButton.addEventListener('click', () => {
            this.isRemoveMode = !this.isRemoveMode;
            document.body.classList.toggle('remove-mode', this.isRemoveMode);
            this.removeButton.classList.toggle('remove-active', this.isRemoveMode);
            if (this.isRemoveMode) this.wallManager.toggleAddWallMode(false);
        });

        // Wall direction switcher
        document.getElementById('switch-direction').addEventListener('click', () => {
            this.wallManager.switchDirection();
        });

        // Mouse interactions
        this.renderer.domElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.renderer.domElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', () => this.stopDragging());
    }

    handleMouseMove(event) {
        if (this.wallManager.isAddWallMode) {
            this.updateWallPreview(event);
        } else if (this.isDragging) {
            this.handleDrag(event);
        } else if (this.isRotating) {
            this.handleRotation(event);
        }
    }

    handleMouseDown(event) {
        if (this.isRemoveMode) {
            this.handleRemoveObject(event);
        } else if (this.wallManager.isAddWallMode) {
            this.wallManager.handleMouseDown(event, this.camera);
        } else {
            // Check for rotation input (right-click or shift+left-click)
            const isRotation = event.button === 2 || event.shiftKey;
            this.handleObjectSelection(event, isRotation);
        }
    }

    updateWallPreview(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObject(this.floor, true);
        
        if (intersects.length > 0) {
            this.wallManager.updatePreviewWall(intersects[0].point);
        }
    }

    handleObjectSelection(event, isRotation) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = this.findMovableParent(intersects[0].object);
            if (object) {
                if (isRotation && object.userData?.isRotatable) {
                    this.startRotation(object, event);
                } else {
                    this.startDragging(object, intersects[0].point);
                }
            }
        }
    }

    findMovableParent(object) {
        while (object && !object.userData?.isMovable) {
            object = object.parent;
        }
        return object?.userData?.isMovable ? object : null;
    }

    startDragging(object, intersectPoint) {
        this.isDragging = true;
        this.selectedObject = object;
        this.controls.enabled = false;
        
        // Snap to ground plane and calculate offset
        object.position.y = 0.1;
        this.offset.copy(object.position).sub(intersectPoint);
    }

    handleDrag(event) {
        if (!this.isDragging || !this.selectedObject) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(this.plane, intersection);
        
        if (intersection) {
            const newPosition = intersection.add(this.offset);
            newPosition.y = 0.1;
            this.selectedObject.position.copy(newPosition);
        }
    }

    startRotation(object, event) {
        this.isRotating = true;
        this.selectedObject = object;
        this.controls.enabled = false;
        this.previousMousePosition.set(event.clientX, event.clientY);
    }

    handleRotation(event) {
        if (!this.isRotating || !this.selectedObject) return;

        const deltaX = event.clientX - this.previousMousePosition.x;
        this.selectedObject.rotation.y += deltaX * 0.01;
        this.previousMousePosition.set(event.clientX, event.clientY);
    }

    stopDragging() {
        if (this.isDragging || this.isRotating) {
            this.isDragging = false;
            this.isRotating = false;
            this.selectedObject = null;
            this.controls.enabled = true;
        }
    }

    handleRemoveObject(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = this.findRemovableParent(intersects[0].object);
            if (object) {
                this.scene.remove(object);
                if (object.userData.isWall) {
                    this.wallManager.walls = this.wallManager.walls
                        .filter(wall => wall.uuid !== object.uuid);
                }
                this.disposeObject(object);
            }
        }
    }

    findRemovableParent(object) {
        while (object && 
               !object.userData?.isWall && 
               !object.userData?.isChair &&
               !object.userData?.isFurniture) {
            object = object.parent;
        }
        return object?.userData?.isWall || 
               object?.userData?.isChair || 
               object?.userData?.isFurniture ? object : null;
    }
    disposeObject(object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    }
}