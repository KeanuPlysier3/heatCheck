import * as THREE from 'three/webgpu';
import { Basketball } from '../constants/basketball';
import { Colors } from '../constants/colors';
import { Outline } from '../constants/outline';
import { createOutlineMesh } from '../helpers/outline';


export const createBasketball = () => {
    const basketball = new THREE.Object3D();

    // empty container, so the whole court can be moved or hidden as one thing
    const ballGeometry = new THREE.SphereGeometry(Basketball.radius, 32, 16);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: Colors.basketball });
    const sphere = new THREE.Mesh(ballGeometry, ballMaterial);
    basketball.add(sphere);

    const outlineGeometry = new THREE.SphereGeometry(Basketball.radius + Outline.thickness, 32, 16);
    const outlineMesh = createOutlineMesh(outlineGeometry);
    basketball.add(outlineMesh);

    const cilinderGeometry = new THREE.CylinderGeometry(Basketball.radius, Basketball.radius, Basketball.radius * 2, 32);
    const cilinderMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0, });
    const cilinder = new THREE.Mesh(cilinderGeometry, cilinderMaterial);
    cilinder.position.y = Basketball.radius;
    basketball.add(cilinder);
    

    return basketball;
};
