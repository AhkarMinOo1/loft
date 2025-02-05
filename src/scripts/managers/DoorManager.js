import * as THREE from 'three';

export class DoorManager {
    constructor(scene, wallManager, renderer) {
        this.scene = scene;
        this.wallManager = wallManager;
        this.renderer = renderer;
        this.isPlacementMode = false;
        this.previewDoor = this.createPreviewDoor();
    }

    createPreviewDoor() {
        const geometry = new THREE.BoxGeometry(1.2, 2.4, 0.2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        const door = new THREE.Mesh(geometry, material);
        door.visible = false;
        this.scene.add(door);
        return door;
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
            if (wall.userData.isWall) {
                this.previewDoor.position.copy(intersects[0].point);
                this.previewDoor.quaternion.copy(wall.quaternion);
                this.previewDoor.visible = true;
            }
        } else {
            this.previewDoor.visible = false;
        }
    }

    placeDoor(camera, event) {
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
            const point = intersects[0].point;
            
            // Convert to wall's local space
            wall.worldToLocal(point);
            const door = this.createDoor(wall, point);
            
            wall.userData.openings = wall.userData.openings || [];
            wall.userData.openings.push(door);
        }
    }

    createDoor(parentWall, localPosition) {
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 2, 0.1),
            new THREE.MeshPhongMaterial({ color: 0x8B4513 })
        );
        
        // Attach to parent wall's coordinate system
        parentWall.add(door);
        door.position.copy(localPosition);
        
        door.userData = {
            isDoor: true,
            parentWall: parentWall,
            parentWallId: parentWall.uuid,
            isInteractable: true
        };
        
        return door;
    }

    createDoorFromSave(wall, position, rotation) {
        const door = this.createDoor(wall, position);
        door.rotation.copy(rotation);
        return door;
    }

    createDoorFromData(positionArray, rotationData, parentWall) {
        // Get LOCAL position from saved data
        const localPosition = new THREE.Vector3().fromArray(positionArray);
        
        // Create door directly in parent wall's space
        const door = this.createDoor(parentWall, localPosition);
        door.rotation.set(rotationData.x, rotationData.y, rotationData.z);
        
        // Position relative to parent wall
        door.position.copy(localPosition);
        
        console.log('Door local position:', localPosition);
        console.log('World position:', door.getWorldPosition(new THREE.Vector3()));
        return door;
    }
} 