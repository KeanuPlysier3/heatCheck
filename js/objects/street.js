import * as THREE from 'three/webgpu';
import { Street } from '../constants/street';
import { Colors, SelfLight } from '../constants/colors';

// the asphalt, a dashed line down the middle and a zebra crossing near the camera end
export const createStreet = () => {
    const street = new THREE.Object3D();

    // asphalt: a flat plane a hair above the surround, two surfaces at the same height would flicker
    const asphaltGeometry = new THREE.PlaneGeometry(Street.width, Street.length);
    const asphaltMaterial = new THREE.MeshPhongMaterial({ color: Colors.street, emissive: Colors.street, emissiveIntensity: SelfLight });
    const asphaltMesh = new THREE.Mesh(asphaltGeometry, asphaltMaterial);
    asphaltMesh.rotation.x = Math.PI * -.5; // a plane stands upright by default, lay it flat
    asphaltMesh.position.set(Street.centreX, Street.groundY + 0.01, 0);
    asphaltMesh.receiveShadow = true;
    street.add(asphaltMesh);

    // the markings lie a little higher again, on top of the asphalt
    const markingY = Street.groundY + 0.02;
    const markingMaterial = new THREE.MeshPhongMaterial({ color: Colors.streetLine, emissive: Colors.streetLine, emissiveIntensity: SelfLight });

    // dashed centre line: one dash every dashLength + dashGap, from one end of the street to the other
    const dashGeometry = new THREE.PlaneGeometry(Street.dashWidth, Street.dashLength);
    const dashStep = Street.dashLength + Street.dashGap;
    for (let z = -Street.length / 2 + Street.dashLength / 2; z < Street.length / 2; z += dashStep) {
        const dashMesh = new THREE.Mesh(dashGeometry, markingMaterial);
        dashMesh.rotation.x = Math.PI * -.5;
        dashMesh.position.set(Street.centreX, markingY, z); // a plane is positioned by its centre
        street.add(dashMesh);
    }

    // zebra crossing: stripes that run along the street, side by side across its width
    const stripeGeometry = new THREE.PlaneGeometry(Street.crosswalkStripeWidth, Street.crosswalkDepth);
    const crosswalkMaterial = new THREE.MeshPhongMaterial({ color: Colors.crosswalk, emissive: Colors.crosswalk, emissiveIntensity: SelfLight });
    const stripeStep = Street.crosswalkStripeWidth + Street.crosswalkStripeGap;
    // as many stripes as fit with at least one gap left over, then centred, so both kerbs keep the same margin
    const stripeCount = Math.floor((Street.width - Street.crosswalkStripeGap) / stripeStep);
    const stripesWidth = stripeCount * Street.crosswalkStripeWidth + (stripeCount - 1) * Street.crosswalkStripeGap;
    const firstStripeX = Street.centreX - stripesWidth / 2 + Street.crosswalkStripeWidth / 2;
    for (let i = 0; i < stripeCount; i++) {
        const stripeMesh = new THREE.Mesh(stripeGeometry, crosswalkMaterial);
        stripeMesh.rotation.x = Math.PI * -.5;
        stripeMesh.position.set(firstStripeX + i * stripeStep, markingY, Street.crosswalkZ);
        street.add(stripeMesh);
    }

    return street;
};
