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
    }

    toggleAddWallMode() {
        this.isAddWallMode = !this.isAddWallMode;
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

    wallExists(x, z) {
        return this.walls.some(wall => 
            Math.abs(wall.position.x - x) < 0.1 && 
            Math.abs(wall.position.z - z) < 0.1
        );
    }
}