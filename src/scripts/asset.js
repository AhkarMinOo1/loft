import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

export async function chair(scene) {
    const loader = new OBJLoader();
    try {
        const group = await loader.loadAsync('models/chair/obj/3SM.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,  // Default gray color
                shininess: 30
            });

            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isChair: true,
                isRotatable: true
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading chair:", error);
        return null;
    }
}

export async function table(scene) {
    const loader = new OBJLoader();
    try {
        const group = await loader.loadAsync('models/table/Table.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,  // Default gray color
                shininess: 30
            });

            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isFurniture: true,
                isRotatable: true
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading table:", error);
        return null;
    }
}