// all sizes are in metres, masses in kilograms: 1 unit in the scene = 1 metre
// official size 7 ball, the one used in men's FIBA and NBA games
export const Basketball = {
    circumference: 0.75, // official range 0.749 - 0.780
    mass: 0.6, // official range 0.567 - 0.650

    // the black lines pressed into the ball, for the shader
    seamWidth: 0.0064, // about a quarter of an inch

    // physics material. these are tuned by feel from the real world values, not measured
    restitution: 0.8, // bounciness. official test: dropped from 1.8 m it must come back up to 1.2 - 1.4 m
    friction: 0.6, // rubber grips the floor and the rim
    linearDamping: 0.05, // a little air drag so it does not fly forever
    angularDamping: 0.3, // slows the spin down
};

// sizes that follow from the circumference, calculated once so nobody has to type them
Basketball.diameter = Basketball.circumference / Math.PI; // 0.239
Basketball.radius = Basketball.diameter / 2; // 0.119, the one the sphere mesh and the sphere collider use
