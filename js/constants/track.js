import { Court } from './court';

// the elevated train line behind the hoop, like the J/M/Z over Broadway in Bushwick. sizes in metres.
// it runs along x, across the whole width of the surround, behind both rows of buildings
export const Track = {
    groundY: -Court.thickness, // the surround's height, the columns stand on it
    length: Court.surroundWidth, // from one side of the surround to the other
    centreZ: 13.9, // the middle of the deck: behind the buildings (which end at 12.5), inside the surround (to 15)

    // the deck: one long steel girder the trains run on
    deckY: 6, // the top of the deck above the ground
    deckWidth: 2.2, // across, along z
    deckThickness: 0.6,

    // the columns holding it up, in pairs under both edges of the deck
    columnSpacing: 5, // along the track
    columnSize: 0.35, // the side of a square column

    // the two rails on top of the deck
    railGauge: 1.4, // the distance between the two rails
    railWidth: 0.1,
    railHeight: 0.12,

    // the sleepers under the rails, painted on top of the deck
    sleeperSpacing: 0.6, // one sleeper every this many metres
    pixelsPerMetre: 32, // how sharp the painted sleepers are
};
