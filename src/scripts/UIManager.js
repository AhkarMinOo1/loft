import { chair, table } from './asset.js';
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

        // Bind event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.stopDragging = this.stopDragging.bind(this);

        // Initialize UI components
        this.initializeUI();
        this.initFileHandlers();
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
                thumbnail: 'assets/thumbnails/table.jpg',
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
            if (this.isRemoveMode) {
                this.wallManager.toggleAddWallMode(false); // Force disable wall mode
            }
        });
        // Wall direction switcher
        document.getElementById('switch-direction').addEventListener('click', () => {
            this.wallManager.switchDirection();
        });

        // Mouse interactions
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.stopDragging);
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
        object.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }

    initFileHandlers() {
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const fileInput = document.getElementById('file-input');

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveScene();
            });
        }

        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.loadScene(file);
            });
        }
    }

    saveScene() {
        try {
            const sceneData = {
                version: 2,
                objects: []
            };

            this.scene.traverse(obj => {
                if (obj.userData?.isMovable || obj.userData?.isWall) {
                    const objData = {
                        type: obj.userData.isWall ? 'wall' : 'furniture',
                        uuid: obj.uuid,
                        position: obj.position.toArray(),
                        rotation: {
                            x: obj.rotation.x,
                            y: obj.rotation.y,
                            z: obj.rotation.z,
                            order: obj.rotation.order
                        },
                        scale: obj.scale.toArray(),
                        userData: obj.userData
                    };

                    if (obj.userData.isWall) {
                        objData.direction = this.wallManager.direction;
                        objData.start = this.wallManager.currentWallStart?.toArray() || [0, 0, 0];
                        objData.end = obj.position.toArray();
                    }

                    sceneData.objects.push(objData);
                }
            });

            const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `scene-${Date.now()}.3dscene`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 100);

        } catch (error) {
            console.error('Save failed:', error);
            alert(`Save failed: ${error.message}`);
        }
    }

    async loadScene(file) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                this.showLoading(true);
                const sceneData = JSON.parse(e.target.result);
                
                if (!sceneData.version || sceneData.version < 2) {
                    throw new Error('Invalid or outdated scene file format');
                }

                await this.clearScene();

                const loadPromises = sceneData.objects.map(async (objData) => {
                    if (objData.type === 'wall') {
                        this.recreateWall(objData);
                    } else {
                        await this.recreateFurniture(objData);
                    }
                });

                await Promise.all(loadPromises);
                alert('Scene loaded successfully!');
            } catch (error) {
                console.error('Load error:', error);
                alert(`Load failed: ${error.message}`);
            } finally {
                this.showLoading(false);
            }
        };
        
        reader.readAsText(file);
    }

    async clearScene() {
        return new Promise((resolve) => {
            this.scene.traverse(obj => {
                if (obj.userData?.isMovable || obj.userData?.isWall) {
                    this.scene.remove(obj);
                    this.disposeObject(obj);
                }
            });
            this.wallManager.reset();
            resolve();
        });
    }

    async recreateFurniture(data) {
        try {
            let model;
            if (data.userData.isChair) {
                model = await chair(this.scene);
            } else if (data.userData.isFurniture) {
                model = await table(this.scene);
            }

            if (model) {
                model.position.fromArray(data.position);
                model.rotation.set(
                    data.rotation.x,
                    data.rotation.y,
                    data.rotation.z,
                    data.rotation.order
                );
                model.scale.fromArray(data.scale);
                model.userData = data.userData;
            }
        } catch (error) {
            console.error('Error recreating furniture:', error);
            throw error;
        }
    }

    recreateWall(data) {
        const wall = this.wallManager.createWallFromData(data);
        wall.position.fromArray(data.end);
        wall.rotation.set(
            data.rotation.x,
            data.rotation.y,
            data.rotation.z,
            data.rotation.order
        );
        wall.userData = data.userData;
        this.scene.add(wall);
    }

    showLoading(show) {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }
}