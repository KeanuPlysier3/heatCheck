import * as THREE from 'three/webgpu';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickables = [];   // { root, onClick }

export const makeClickable = (root, onClick) => clickables.push({ root, onClick });

const findHit = (event, canvas, camera) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return clickables.find(({ root }) => raycaster.intersectObject(root, true).length > 0);//It goes through your clickable objects one by one and returns the first one the mouse ray passes through, or nothing if it misses them all.
};

export const setupPointer = (canvas, camera) => {
    canvas.addEventListener('pointermove', (event) => {
        canvas.style.cursor = findHit(event, canvas, camera) ? 'pointer' : '';
    });
    canvas.addEventListener('click', (event) => findHit(event, canvas, camera)?.onClick());
};
