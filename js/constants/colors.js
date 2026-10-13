// palette: late-90s cartoon skate park. loud opposite colours (orange/teal, pink/purple),
// cream instead of pure white and dark purple instead of pure black
// vibrant options for the player's colour, all of them loud against the teal court and the orange sky
const playerColors = [
  0xFF3D8B, // hot pink
  0x9B5DE5, // electric violet
  0xFFD400, // taxi yellow
  0xFF2E4D, // cherry red
  0x2F6BFF, // royal blue, deeper than the sky blue so it stands out on the teal court
  0xB6F500, // lime
];

export const Colors = {
  background: 0xFFA552,
  blue: 0x01b7ff, // sunset orange sky
  surround: 0x6F6A75, // grey asphalt with a hint of lilac, the ground of the block (was purple, 0x4A3470)
  court: 0x16C7B0, // painted teal street court
  courtPaint: 0xFF3D8B, // hot pink, for the key (not used yet)
  courtLines: 0xffffff, // playground yellow, the same yellow as the pole (was cream, 0xFFF1D0)
  hoopPole: 0xFFD400, // taxi yellow
  hoopBackboard: 0xFFF1D0, // cream
  hoop: 0xFF5A1F, // hot orange, the rim
  playerColors, // the options to choose from
  net: 0xFFF1D0, // cream
  outline: 0x1B1030, // very dark purple
  accent: 0xB6F500, // lime green, for UI and details (not used yet)
  player: playerColors[0], // the player's colour, the first option (hot pink) is the default
  basketball: 0xFF5F1F,
  fireBasketball: 0xfffff0,
  street: 0x2C2140, // dark purple asphalt, darker than the surround
  streetLine: 0xFFD400, // the dashed middle line, the same yellow as the pole
  crosswalk: 0xFFF1D0, // cream zebra stripes
  sidewalk: 0xC8A27C, // sandy beige concrete (was greyish lilac, 0x8C82A0)
  treeTrunk: 0x6B3B2A, // dark brown
  treeLeaves: 0x5CBF4A, // fresh green
  treeLeavesDark: 0x2F8F4E, // deeper green, alternated with the fresh one so the cubes stand apart
  fenceWire: 0xB8B2C8, // light lilac grey, the chain-link mesh
  fencePost: 0x7A7290, // darker lilac grey, the posts and the top rail
  brownstone: 0x9A5B44, // warm brown stone
  brownstoneRed: 0xB5533C, // red brick
  brownstoneDark: 0x6E3F33, // dark brown
  cornice: 0x4A3470, // the ledge on top of the buildings, the surround's purple
  windowLit: 0xFFD27A, // warm light behind a window
  windowDark: 0x2C2140, // an unlit window, the street's dark purple
  door: 0x3A2218, // dark wood
  waterTower: 0x8C5A2B, // weathered wood
  trackSteel: 0x2B5D6E, // the elevated train's girders and columns, a dark teal steel
  trackDeck: 0x3B3350, // the top of the deck between the sleepers
  trackSleeper: 0x5A3A2A, // wooden sleepers
  trackRail: 0xB8B2C8, // the rails, the same light grey as the fence wire
  wallConcrete: 0x5E5BD1, // the mural wall, a purplish blue (was beige 0xE3CFA8)
  standFrame: 0x7A7290, // the bleachers' steps and railing, the same lilac grey as the fence posts
  standSeat: 0xFF3D8B, // the seat planks, the hot pink of the key (was the pole's yellow, 0xFFD400)
};

export const SelfLight = 1;


