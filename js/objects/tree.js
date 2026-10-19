import * as THREE from 'three/webgpu';
import { Tree } from '../constants/tree';
import { Street, Sidewalk } from '../constants/street';
import { Colors, SelfLight } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';

// random number
const randomBetween = (min, max) => min + Math.random() * (max - min);

// materials
const trunkMaterial = new THREE.MeshPhongMaterial({ color: Colors.treeTrunk, emissive: Colors.treeTrunk, emissiveIntensity: SelfLight });
const leafMaterials = [Colors.treeLeaves, Colors.treeLeavesDark].map((color) =>
    new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: SelfLight, flatShading: true })
);


export const createTree = () => {
    const tree = new THREE.Object3D();


    const trunkGeometry = new THREE.BoxGeometry(Tree.trunkWidth, Tree.trunkHeight, Tree.trunkWidth);
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = Tree.trunkHeight / 2; // a box is centred on its middle, lift it by half its height
    tree.add(trunkMesh);

    // trunk outline
    const trunkOutlineGeometry = new THREE.BoxGeometry(Tree.trunkWidth + Outline.thickness * 2, Tree.trunkHeight + Outline.thickness * 2, Tree.trunkWidth + Outline.thickness * 2);
    trunkMesh.add(createOutlineMesh(trunkOutlineGeometry));

    // crown
    const leafCount = Math.round(randomBetween(Tree.leafCountMin, Tree.leafCountMax));
    for (let i = 0; i < leafCount; i++) {
        const size = randomBetween(Tree.leafSizeMin, Tree.leafSizeMax);

        const leafGeometry = new THREE.BoxGeometry(size, size, size);
        const leafMaterial = leafMaterials[i % leafMaterials.length]; // alternate the two greens, so the cubes stand apart
        const leafMesh = new THREE.Mesh(leafGeometry, leafMaterial);
        leafMesh.position.set(
            randomBetween(-Tree.leafSpread, Tree.leafSpread),
            Tree.trunkHeight + randomBetween(0, Tree.leafRise),
            randomBetween(-Tree.leafSpread, Tree.leafSpread),
        );
        leafMesh.rotation.set(
            randomBetween(-Tree.leafTilt, Tree.leafTilt),
            randomBetween(0, Math.PI / 2), // a quarter turn is enough: a cube looks the same every 90°
            randomBetween(-Tree.leafTilt, Tree.leafTilt),
        );
        leafMesh.castShadow = true;
        tree.add(leafMesh);

        // leaf outline
        const leafOutlineGeometry = new THREE.BoxGeometry(size + Outline.thickness * 2, size + Outline.thickness * 2, size + Outline.thickness * 2);
        leafMesh.add(createOutlineMesh(leafOutlineGeometry));
    }

    return tree;
};

// trees
export const createTrees = () => {
    const trees = new THREE.Object3D();

    const sidewalkTop = Street.groundY + Sidewalk.height; // the trees stand on top of the sidewalk
    const slotCount = Math.floor(Street.length / Tree.slotLength);

    Sidewalk.strips.forEach((strip) => {
        // tree slots
        for (let slot = 0; slot < slotCount; slot++) {
            if (Math.random() > Tree.chance) continue; // leave this slot empty

            const slotMiddleZ = -Street.length / 2 + (slot + 0.5) * Tree.slotLength;
            const tree = createTree();
            tree.position.set(strip.centreX, sidewalkTop, slotMiddleZ + randomBetween(-Tree.slotJitter, Tree.slotJitter));
            tree.rotation.y = randomBetween(0, Math.PI * 2); // turn the whole tree, so the crowns face different ways
            trees.add(tree);
        }
    });

    return trees;
};
