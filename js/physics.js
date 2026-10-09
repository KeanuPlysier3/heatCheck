import RAPIER from '@dimforge/rapier3d-compat';
import { Basketball } from './constants/basketball';
import { Court } from './constants/court';
await RAPIER.init();


let eventQueue = null;

export const createPhysics = () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    //parameter are half extents, so the ground is 50x50 units
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(25, 0.1, 25).setTranslation(0, -0.1, 0)
    );



    const {
        rimFromBaseline, poleBehindBaseline,
        poleHeight, poleRadius, armThickness,
        backboardWidth, backboardHeight, backboardThickness, backboardBottom,
        rimHeight, rimRadius, rimThickness, rimZ,
    } = Court.Hoop;


    const backboardFront = rimRadius + rimThickness;
    const backboardBack = backboardFront + backboardThickness;
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(backboardWidth / 2, backboardHeight / 2, backboardThickness / 2)
            .setTranslation(0, backboardBottom + backboardHeight / 2, rimZ + backboardFront + backboardThickness / 2)
            .setRestitution(0.6) // glass 
    );

    //a ring of balls 
    const rimPieces = 24;
    for (let i = 0; i < rimPieces; i++) {
        const angle = (i / rimPieces) * Math.PI * 2;
        world.createCollider(
            RAPIER.ColliderDesc.ball(rimThickness)
                .setTranslation(Math.cos(angle) * rimRadius, rimHeight, rimZ + Math.sin(angle) * rimRadius)
                .setRestitution(0.4) // iron rim, a duller bounce than the glass
        );
    }


    const poleZ = rimFromBaseline + poleBehindBaseline;
    const poleLength = poleHeight + Court.thickness;
    world.createCollider(
        RAPIER.ColliderDesc.cylinder(poleLength / 2, poleRadius)
            .setTranslation(0, (poleHeight - Court.thickness) / 2, rimZ + poleZ)
    );

    //arm
    const armLength = poleZ - backboardBack;
    world.createCollider(
        RAPIER.ColliderDesc.cuboid(armThickness / 2, armThickness / 2, armLength / 2)
            .setTranslation(0, backboardBottom + backboardHeight / 2, rimZ + (backboardBack + poleZ) / 2)
    );


    const sensorRadius = rimRadius - rimThickness;
    const sensorHalfHeight = 0.04;


    const makeSensor = (y) => world.createCollider(
        RAPIER.ColliderDesc.cylinder(sensorHalfHeight, sensorRadius)
            .setTranslation(0, y, rimZ)
            .setSensor(true)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    );



    const sensors = {
        top: makeSensor(rimHeight + 0.1),
        bottom: makeSensor(rimHeight - 0.15),
    };



    eventQueue = new RAPIER.EventQueue(true);//start tracking



    // ball
    const ballBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(0, 2, 0)
            .setLinearDamping(Basketball.linearDamping) // slow down over time, so it doesn't roll forever
            .setAngularDamping(Basketball.angularDamping) // slow down over time, so it doesn't spin forever
            .setCcdEnabled(true) // continuous collision detection, so it doesn't go through the ground
    );
    // kept in a variable: collision events report collider handles, and this is the ball's collider.
    // the rigid body (ballBody) has a handle too, but that is a different number
    const ballCollider = world.createCollider(
        RAPIER.ColliderDesc.ball(Basketball.radius)
            .setMass(Basketball.mass)
            .setRestitution(Basketball.restitution)
            .setFriction(Basketball.friction),
        ballBody
    );




    return { world, ballBody, ballCollider, sensors, eventQueue };
};



export const sensorOutput = (world, ballCollider, sensors, eventQueue) => {
    let topSensor = false;
    let bottomSensor = false;
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
        if (started) {
            if ((handle1 === sensors.top.handle && handle2 === ballCollider.handle) ||
                (handle2 === sensors.top.handle && handle1 === ballCollider.handle)) {
                topSensor = true;
            }

            if ((handle1 === sensors.bottom.handle   && handle2 === ballCollider.handle) ||
                (handle2 === sensors.bottom.handle && handle1 === ballCollider.handle)) {
                bottomSensor = true;
            }

        }
    });
    return { topSensor, bottomSensor };
}