// the sleeping cat next to the boombox: curled up on the floor, head resting on its front paws, tail wrapped around.
// sizes in metres, a real cat curled up is about 45 cm long. it lies along x with its head on the -x side
export const Cat = {
    catColors: [
        0xD9A066, // ginger
        0x8D99AE, // blue-grey
        0xF2E8CF, // cream
        0x4A4E69, // dark grey
        0x2B2D42, // charcoal
        0xC9ADA7, // dusty rose-grey
        0xFFFFFF, // white
        0xA47148, // brown
        0xBFC0C0, // silver
        0xE6B566, // golden ginger
    ],
    innerEar: 0xFF9EB5, // soft pink, the inside of the ears and the nose

    // the curled-up body: a low, wide loaf
    body: { width: .38, height: .15, depth: .26 },

    // the head, at the front end of the body, lying low on the paws
    head: { width: .15, height: .12, depth: .15, tilt: .2 }, // tilt: radians, the head leans onto its side a little

    ear: { radius: .035, height: .06 },

    // the two front paws, sticking out under the chin
    paw: { width: .07, height: .035, depth: .05 },

    // the tail: a straight piece along the front of the body, and the tip curling round towards the head
    tail: { thickness: .045, length: .3, tipLength: .12 },

    // the closed eyes: two thin dark lines. awake they are small squares (openHeight high and wide)
    eye: { width: .035, height: .008, openHeight: .022 },

    // standing up: a slimmer body on four legs
    standing: { width: .34, height: .13, depth: .14, legHeight: .16, legSize: .045 },
};
