import * as THREE from 'three';

export class WallManager {
    constructor(scene, floor, gridSize, renderer) {
        this.scene = scene;
        this.floor = floor;
        this.gridSize = gridSize;
        this.renderer = renderer;
        this.walls = [];
        this.isAddWallMode = false;
        this.direction = 'horizontal';
        
        // Preview wall properties
        this.previewWall = null;
        this.isPreviewActive = false;

        // Initialize preview wall
        this.createPreviewWall();
        this.initPreviews();
    }

    toggleAddWallMode(enable) {  // Modified to accept parameter
        if (typeof enable !== 'undefined') {
            this.isAddWallMode = enable;
        } else {
            this.isAddWallMode = !this.isAddWallMode;
        }
        this.previewWall.visible = this.isAddWallMode;
        return this.isAddWallMode;
    }

    switchDirection() {
        this.direction = this.direction === 'horizontal' ? 'vertical' : 'horizontal';
        this.updatePreviewWall(this.previewWall.position); // Update rotation
    }

    createPreviewWall() {
        if (this.previewWall) return;

        const geometry = new THREE.BoxGeometry(this.gridSize, 2, 0.2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });
        
        this.previewWall = new THREE.Mesh(geometry, material);
        this.previewWall.visible = false;
        this.scene.add(this.previewWall);
    }

    updatePreviewWall(mousePosition) {
        if (!this.previewWall || !this.isAddWallMode) return;

        // Snap to grid logic
        const snappedX = Math.round(mousePosition.x / this.gridSize) * this.gridSize;
        const snappedZ = Math.round(mousePosition.z / this.gridSize) * this.gridSize;

        // Calculate final position based on direction
        const position = new THREE.Vector3();
        const rotation = this.direction === 'horizontal' ? 0 : Math.PI / 2;
        
        if (this.direction === 'horizontal') {
            position.set(
                snappedX + this.gridSize / 2,
                1,
                snappedZ
            );
        } else {
            position.set(
                snappedX,
                1,
                snappedZ + this.gridSize / 2
            );
        }

        // Check for existing walls
        if (!this.wallExists(position.x, position.z)) {
            this.previewWall.position.copy(position);
            this.previewWall.rotation.y = rotation;
            this.previewWall.visible = true;
        } else {
            this.previewWall.visible = false;
        }
    }

    handleMouseDown(event, camera) {
        if (event.button !== 0 || !this.isAddWallMode || !this.previewWall.visible) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(this.floor, true);

        if (intersects.length > 0) {
            const wall = this.createWall(
                this.previewWall.position.x,
                this.previewWall.position.z
            );
            
            this.scene.add(wall);
            this.walls.push(wall);
            this.previewWall.visible = false; // Add this line
        }
    }
    createWall(x, z) {
        const wallGeometry = new THREE.BoxGeometry(this.gridSize, 2, 0.2);
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x8b8b8b });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);

        wall.position.set(x, 1, z);
        wall.rotation.copy(this.previewWall.rotation);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData.isWall = true;

        return wall;
    }
    reset() {
        this.walls.forEach(wall => {
            this.scene.remove(wall);
            this.disposeObject(wall);
        });
        this.walls = [];
        this.previewWall.visible = false; // Add this line
        this.isAddWallMode = false; // Add this line
    }
      createWallFromData(data) {
        if (!data.start || !data.end) {
            console.error('Missing wall data:', data);
            return null;
        }

        const start = new THREE.Vector3().copy(data.start);
        const end = new THREE.Vector3().copy(data.end);
        
        // Create wall mesh
        const wall = this.createWallMesh(start, end);
        wall.userData = {
            ...data.userData,
            start: start,
            end: end
        };

        return wall;
    }

    wallExists(x, z) {
        return this.walls.some(wall => 
            Math.abs(wall.position.x - x) < 0.1 && 
            Math.abs(wall.position.z - z) < 0.1
        );
    }
    disposeObject(object) {
        if (object === this.previewWall) return; // Prevent disposing preview wall
        object.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    Array.isArray(child.material) 
                        ? child.material.forEach(m => m.dispose())
                        : child.material.dispose();
                }
            }
        });
    }



    initPreviews() {
        // Door preview
        const doorGeometry = new THREE.BoxGeometry(1.2, 2.4, 0.2);
        const doorMaterial = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            renderOrder: 1
        });
        this.previewDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        this.previewDoor.renderOrder = 1;
        this.previewDoor.visible = false;

        // Window preview
        const windowGeometry = new THREE.BoxGeometry(1.5, 1.2, 0.2);
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            renderOrder: 1
        });
        this.previewWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        this.previewWindow.renderOrder = 1;
        this.previewWindow.visible = false;

        this.scene.add(this.previewDoor);
        this.scene.add(this.previewWindow);
    }

    updateStructuralPreviews(camera) {
        return (e) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            
            const intersects = raycaster.intersectObjects(
                this.scene.children.filter(obj => obj.userData.isWall)
            );

            if (intersects.length > 0) {
                const wall = intersects[0].object;
                const point = intersects[0].point;
                
                if (this.isDoorPlacementMode) {
                    this.previewDoor.visible = true;
                    this.previewDoor.position.copy(point);
                    this.previewDoor.quaternion.copy(wall.quaternion);
                } else if (this.isWindowPlacementMode) {
                    this.previewWindow.visible = true;
                    this.previewWindow.position.copy(point);
                    this.previewWindow.quaternion.copy(wall.quaternion);
                }
            } else {
                this.previewDoor.visible = false;
                this.previewWindow.visible = false;
            }
        };
    }

    clearWallPreview() {
        if (this.previewWall) {
            this.previewWall.visible = false;
        }
    }

    addDoorToWall(wall, position) {
        // Create door relative to wall's coordinate system
        const door = this.ui.doorManager.createDoor(wall, position);
        
        // Explicitly store parent reference using consistent casing
        door.userData.parentWall = wall;
        door.userData.parentWallId = wall.uuid; 
        
        // Add to wall's openings
        wall.userData.openings = wall.userData.openings || [];
        wall.userData.openings.push(door);
        
        console.log('Added door to wall:', wall.uuid);
    }
}

