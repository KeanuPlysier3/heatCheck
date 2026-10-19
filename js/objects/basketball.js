import * as THREE from 'three/webgpu';
import { Basketball } from '../constants/basketball';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';
import { uv, uniform } from 'three/tsl';
import { fireFn } from '../shaders/fire.js';


export const createBasketball = () => {
    const basketball = new THREE.Object3D();

    // ball
    const ballGeometry = new THREE.SphereGeometry(Basketball.radius, 32, 16);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: Colors.basketball });
    const sphere = new THREE.Mesh(ballGeometry, ballMaterial);
    basketball.add(sphere);

    const outlineGeometry = new THREE.SphereGeometry(Basketball.radius + Outline.thickness, 32, 16);
    const outlineMesh = createOutlineMesh(outlineGeometry);
    basketball.add(outlineMesh);


    const fireTime = uniform(0);   // seconds, updated every frame so the flame moves
    const fireHeat = uniform(0);   // 0 = no fire, 1 = full fire. start at 1 so you can see it

    const fireHeight = Basketball.radius * 7;
    // flame
    const cilinderGeometry = new THREE.CylinderGeometry(Basketball.radius, Basketball.radius, fireHeight, 32, 1, true);
    const cilinderMaterial = new THREE.MeshBasicNodeMaterial();
    cilinderMaterial.colorNode = fireFn({ uv: uv(), time: fireTime, heat: fireHeat });
    cilinderMaterial.blending = THREE.AdditiveBlending; // black adds nothing, so it becomes see-through
    cilinderMaterial.transparent = true;
    cilinderMaterial.depthWrite = false;                // the flame must not hide things behind it
    cilinderMaterial.side = THREE.DoubleSide
    const cilinder = new THREE.Mesh(cilinderGeometry, cilinderMaterial);

    cilinder.position.y = fireHeight/2;
    basketball.add(cilinder);

    // inner flames
    const innerFlames = [
        { radius: Basketball.radius * 0.66, height: fireHeight + Basketball.radius * 2, turn: Math.PI * 0.6 },
        { radius: Basketball.radius * 0.33, height: fireHeight + Basketball.radius * 4, turn: Math.PI * 1.3 },
    ];
    innerFlames.forEach((flame) => {
        const innerGeometry = new THREE.CylinderGeometry(flame.radius, flame.radius, flame.height, 32, 1, true);
        const innerCilinder = new THREE.Mesh(innerGeometry, cilinderMaterial);
        innerCilinder.position.y = flame.height / 2; 
        innerCilinder.rotation.y = flame.turn; 
        basketball.add(innerCilinder);
    });


    return { basketball, ballMaterial, fire: { time: fireTime, heat: fireHeat } };
};
