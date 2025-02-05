import * as THREE from 'three';

export class WindowManager {
    constructor(scene, wallManager, renderer) {
        this.scene = scene;
        this.wallManager = wallManager;
        this.renderer = renderer;
        this.isPlacementMode = false;
        this.previewWindow = this.createPreviewWindow();
    }

    createPreviewWindow() {
        const geometry = new THREE.BoxGeometry(1.5, 1.2, 0.2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        const window = new THREE.Mesh(geometry, material);
        window.visible = false;
        this.scene.add(window);
        return window;
    }

    updatePreview(camera, event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(
            this.wallManager.walls
        );

        if (intersects.length > 0) {
            const wall = intersects[0].object;
            this.previewWindow.position.copy(intersects[0].point);
            this.previewWindow.quaternion.copy(wall.quaternion);
            this.previewWindow.visible = true;
        } else {
            this.previewWindow.visible = false;
        }
    }

    placeWindow(camera, event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(this.wallManager.walls);

        if (intersects.length > 0) {
            const wall = intersects[0].object;
            const window = this.createWindow(wall, intersects[0].point);
            this.scene.add(window);
            wall.userData.openings = wall.userData.openings || [];
            wall.userData.openings.push(window);
        }
    }

    createWindow(parentWall, position) {
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1, 0.1),
            new THREE.MeshPhongMaterial({ color: 0x87CEEB })
        );
        window.userData = {
            isWindow: true,
            parentWall: parentWall,
            isInteractable: true
        };
        window.position.copy(position);
        window.rotation.copy(parentWall.rotation);
        
        return window;
    }

    createWindowFromSave(wall, position, rotation) {
        const window = this.createWindow(wall, position);
        window.rotation.copy(rotation);
        return window;
    }

    createWindowFromData(position, rotation, parentWall) {
        const window = this.createWindow(parentWall, position);
        window.rotation.set(rotation.x, rotation.y, rotation.z);
        
        // Ensure window is added to scene
        if (!this.scene.children.includes(window)) {
            this.scene.add(window);
        }
        
        return window;
    }
} 