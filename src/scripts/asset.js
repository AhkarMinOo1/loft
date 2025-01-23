import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// asset.js
export async function chair(scene) {
    const loader = new OBJLoader();
    try {
        const group = await loader.loadAsync('models/chair/obj/3SM.obj');
        if (group.children.length > 0) {
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isChair: true,
                isRotatable: true // Add rotation flag
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
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isChair: true,
                isRotatable: true // Add rotation flag
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading chair:", error);
        return null;
    }
}