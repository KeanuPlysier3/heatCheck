import * as THREE from 'three/webgpu';
import { createStreet } from './objects/street';
import { createSidewalks } from './objects/sidewalk';
import { createCrossStreet } from './objects/crossStreet';
import { createTrees } from './objects/tree';
import { createFence } from './objects/fence';
import { createBuildings } from './objects/buildings';
import { createTrack } from './objects/track';
import { createWall } from './objects/wall';
import { createStands } from './objects/stands';

// everything around the court that is only there for the look: the street, the sidewalks, and later the
// buildings, the fence and the train. nothing in here has a collider, so the game plays the same without it,
// and in performance mode this whole function can be skipped
export const createEnvironment = () => {
    const environment = new THREE.Group();

    environment.add(createStreet());
    environment.add(createSidewalks());
    environment.add(createCrossStreet());
    environment.add(createTrees());
    environment.add(createFence());
    environment.add(createBuildings());
    environment.add(createTrack());
    environment.add(createWall());
    environment.add(createStands());

    return environment;
};
