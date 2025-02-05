import * as THREE from 'three';

export class FileManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.API_URL = 'http://localhost:3000/api/scenes';
        this.initFileHandlers();
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

        if (loadBtn) {
            loadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSceneList();
            });
        }
    }

    async saveScene() {
        try {
            this.ui.showLoading(true);
            const sceneData = {
                name: `Scene ${Date.now()}`,
                data: {
                    objects: [],
                    version: 2
                }
            };

            // Collect scene data including doors and windows
            this.ui.scene.traverse(obj => {
                if (obj.userData?.isMovable || obj.userData?.isWall || 
                    obj.userData?.isDoor || obj.userData?.isWindow) {
                    const objData = {
                        type: obj.userData.isWall ? 'wall' : 
                              obj.userData.isDoor ? 'door' :
                              obj.userData.isWindow ? 'window' : 'furniture',
                        position: obj.position.toArray(),
                        rotation: {
                            x: obj.rotation.x,
                            y: obj.rotation.y,
                            z: obj.rotation.z,
                            order: obj.rotation.order
                        },
                        scale: obj.scale.toArray(),
                        userData: {
                            ...Object.fromEntries(
                                Object.entries(obj.userData).filter(
                                    ([key]) => !['parentWall', 'openings'].includes(key)
                                )
                            ),
                            uuid: obj.uuid,
                            parentWallId: obj.userData.parentWall?.uuid
                        }
                    };
                    sceneData.data.objects.push(objData);
                }
            });

            return fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(sceneData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to save scene');
                }
                return response.json();
            })
            .then(result => {
                console.log('Save result:', result);
                alert('Scene saved successfully!');
            })
            .catch(error => {
                console.error('Save failed:', error);
                alert(`Save failed: ${error.message}`);
            })
            .finally(() => {
                this.ui.showLoading(false);
            });
        } catch (error) {
            console.error('Save failed:', error);
            alert(`Save failed: ${error.message}`);
            this.ui.showLoading(false);
        }
    }

    async loadSceneList() {
        try {
            this.ui.showLoading(true);
            const response = await fetch(this.API_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch scenes');
            }

            const scenes = await response.json();
            if (scenes.length === 0) {
                alert('No saved scenes found');
                return;
            }

            // Create and show scene selection modal
            this.showSceneSelectionModal(scenes);

        } catch (error) {
            console.error('Load failed:', error);
            alert(`Load failed: ${error.message}`);
        } finally {
            this.ui.showLoading(false);
        }
    }

    showSceneSelectionModal(scenes) {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Load Scene</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group bg-dark">
                            ${scenes.map(scene => `
                                <button class="list-group-item list-group-item-action bg-dark text-light scene-item" 
                                        data-scene-id="${scene._id}">
                                    ${scene.name}
                                    <small class="text-muted d-block">
                                        Created: ${new Date(scene.createdAt).toLocaleString()}
                                    </small>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.btn-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelectorAll('.scene-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadScene(item.dataset.sceneId);
                document.body.removeChild(modal);
            });
        });

        document.body.appendChild(modal);
    }

    async loadScene(sceneId, isViewOnly = false) {
        try {
            this.ui.showLoading(true);
            const response = await fetch(`${this.API_URL}/${sceneId}`);
            const sceneData = await response.json();
            
            this.clearScene();
            const wallMap = new Map();

            // First pass - create walls
            const wallData = sceneData.data.objects.filter(o => o.type === 'wall');
            for (const objectData of wallData) {
                const wall = await this.recreateObject(objectData, isViewOnly, wallMap);
                if (wall) {
                    wallMap.set(objectData.userData.uuid, wall);
                    this.ui.wallManager.walls.push(wall);
                }
            }

            // Second pass - create other objects
            const nonWallData = sceneData.data.objects.filter(o => o.type !== 'wall');
            for (const objectData of nonWallData) {
                await this.recreateObject(objectData, isViewOnly, wallMap);
            }

            if (isViewOnly) this.setupViewOnlyMode();
            console.log('Scene loaded with', sceneData.data.objects.length, 'objects');
        } catch (error) {
            console.error('Load failed:', error);
            alert(`Load failed: ${error.message}`);
        } finally {
            this.ui.showLoading(false);
        }
    }

    setupViewOnlyMode() {
        // Disable orbit controls dragging/zooming
        this.ui.controls.enableRotate = false;
        this.ui.controls.enableZoom = true;  // Allow zoom for better viewing
        this.ui.controls.enablePan = false;

        // Hide UI elements that shouldn't be available in view mode
        const elementsToHide = [
            document.getElementById('remove-object'),
            document.getElementById('switch-direction'),
            document.getElementById('save-btn'),
            document.getElementById('load-btn'),
            document.getElementById('sidebar-toggle')
        ];

        elementsToHide.forEach(element => {
            if (element) element.style.display = 'none';
        });

        // Hide the sidebar if it's open
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }

        // Add view-only mode indicator
        const viewModeIndicator = document.createElement('div');
        viewModeIndicator.className = 'view-mode-indicator';
        viewModeIndicator.innerHTML = `
            <i class="bi bi-eye"></i>
            <span>View Only Mode</span>
        `;
        document.body.appendChild(viewModeIndicator);
    }

    async recreateObject(data, isViewOnly = false, wallMap = new Map()) {
        try {
            let model;
            if (data.type === 'wall') {
                const geometry = new THREE.BoxGeometry(this.ui.gridSize, 2, 0.2);
                const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
                
                model = new THREE.Mesh(geometry, material);
                model.userData = {
                    isWall: true,
                    isInteractable: !isViewOnly,
                    uuid: data.userData.uuid // Preserve original UUID
                };

                model.position.fromArray(data.position);
                model.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
                model.scale.fromArray(data.scale);

                this.ui.scene.add(model);
                wallMap.set(data.userData.uuid, model);
                console.log('Created wall with UUID:', data.userData.uuid);

            } else if (data.type === 'door') {
                const parentWall = wallMap.get(data.userData.parentWallId);
                if (parentWall) {
                    console.log('Creating door on wall:', parentWall.userData.uuid);
                    
                    // Use absolute position from saved data
                    model = this.ui.doorManager.createDoorFromData(
                        data.position, // This should be world coordinates
                        data.rotation,
                        parentWall
                    );
                    
                    // Ensure proper material
                    model.material = new THREE.MeshPhongMaterial({
                        color: 0x8B4513,
                        transparent: true,
                        opacity: 0.8
                    });
                    
                    model.userData = {
                        ...data.userData,
                        isInteractable: !isViewOnly,
                        isDoor: true,
                        parentWall: parentWall // Re-establish reference
                    };
                    
                    parentWall.userData.openings = parentWall.userData.openings || [];
                    parentWall.userData.openings.push(model);
                } else {
                    console.error('Parent wall not found for door:', data.userData.parentWallId);
                }
            } else if (data.type === 'window') {
                const parentWall = wallMap.get(data.userData.parentWallId);
                if (parentWall) {
                    model = this.ui.windowManager.createWindowFromData(
                        data.position,
                        data.rotation,
                        parentWall
                    );
                    model.userData = {
                        ...data.userData,
                        isInteractable: !isViewOnly,
                        isWindow: true
                    };
                    this.ui.scene.add(model);
                    parentWall.userData.openings = parentWall.userData.openings || [];
                    parentWall.userData.openings.push(model);
                }
            } else {
                if (data.userData.isChair) {
                    model = await this.ui.createChair();
                } else if (data.userData.isFurniture) {
                    model = await this.ui.createTable();
                } else if (data.userData.isSofa) {
                    model = await this.ui.createSofa();
                } else if (data.userData.isTable) {
                    model = await this.ui.createRoundTable();
                }
            }

            if (model) {
                model.position.fromArray(data.position);
                model.rotation.set(
                    data.rotation.x,
                    data.rotation.y,
                    data.rotation.z
                );
                model.scale.fromArray(data.scale);
                model.userData = {
                    ...data.userData,
                    isInteractable: !isViewOnly
                };

                // Set up shadows for walls
                if (data.type === 'wall') {
                    model.castShadow = true;
                    model.receiveShadow = true;
                }
                // Handle furniture materials
                else if (model.material) {
                    if (data.userData.isBooked) {
                        if (Array.isArray(model.material)) {
                            model.material.forEach(mat => mat.color.setHex(0xff0000)); // Red for booked
                        } else {
                            model.material.color.setHex(0xff0000); // Red for booked
                        }
                    } else if (data.userData.isChair || data.userData.isFurniture) {
                        if (Array.isArray(model.material)) {
                            model.material.forEach(mat => mat.color.setHex(0x00ff00)); // Green for available
                        } else {
                            model.material.color.setHex(0x00ff00); // Green for available
                        }
                    }
                }
            }

            return model;
        } catch (error) {
            console.error('Error recreating object:', error);
            throw error;
        }
    }

    clearScene() {
        // Remove all objects except floor
        const objectsToRemove = [];
        this.ui.scene.traverse((object) => {
            // Skip the floor and essential objects
            if (object === this.ui.floor || !object.isMesh) return;
            
            objectsToRemove.push(object);
        });

        // Remove objects and dispose of resources
        objectsToRemove.forEach(object => {
            this.ui.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Clear walls array in WallManager
        if (this.ui.wallManager) {
            this.ui.wallManager.walls = [];
        }
    }
}