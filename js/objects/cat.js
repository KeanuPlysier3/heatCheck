import * as THREE from 'three';
import { Cat } from '../constants/cat';
import { createOutlineMesh } from '../helpers/outline';
import { Outline } from '../constants/outline';
import { Boombox } from '../constants/boombox';

export const createCat = () => {
    const cat = new THREE.Object3D();
    const { width, height, depth } = Cat;
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const randomColorIndex = Math.floor(Math.random() * Cat.catColors.length);

    const material = new THREE.MeshStandardMaterial({ color: Cat.catColors[0] });
    const mesh = new THREE.Mesh(geometry, material);

    const outlineGeometry = new THREE.BoxGeometry(width + Outline.thickness * 2, height + Outline.thickness * 2, depth + Outline.thickness * 2);
    const outlineMesh = createOutlineMesh(outlineGeometry);
    mesh.add(outlineMesh);
    cat.add(mesh);

    cat.position.set(Boombox.x +1.5, 0, Boombox.z);
    return cat;

}