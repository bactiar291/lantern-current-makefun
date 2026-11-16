export const HOME = { x: 108, y: 290 };
export const STAGES = [
  {
    name: 'The Reedwater', subtitle: 'Learn the river. Bring two lights home.', limit: 110,
    tip: 'Hold SPACE near a keeper to board. Return to the striped lighthouse pier.',
    keepers: [{ x: 390, y: 160, name: 'Wren' }, { x: 745, y: 390, name: 'Orrin' }],
    islands: [{ x: 390, y: 98, r: 43 }, { x: 755, y: 330, r: 40 }, { x: 560, y: 490, r: 21 }],
    reefs: [{ x: 520, y: 270, r: 30 }, { x: 565, y: 300, r: 23 }],
    currents: [{ x: 210, y: 215, w: 530, h: 85, dx: 28, dy: 0 }],
    docks: [{ x: 575, y: 400, name: 'Reed shelter' }]
  },
  {
    name: 'Copper Narrows', subtitle: 'Three lights. Two seats. Choose your crossing.', limit: 125,
    tip: 'The middle passage is fast but rocky. The northern water is calm.',
    keepers: [{ x: 330, y: 145, name: 'Pip' }, { x: 790, y: 150, name: 'Sable' }, { x: 745, y: 445, name: 'Moss' }],
    islands: [{ x: 330, y: 83, r: 43 }, { x: 802, y: 90, r: 40 }, { x: 750, y: 385, r: 41 }, { x: 490, y: 340, r: 35 }],
    reefs: [{ x: 465, y: 200, r: 26 }, { x: 510, y: 237, r: 26 }, { x: 565, y: 270, r: 25 }, { x: 610, y: 315, r: 23 }],
    tide: { period: 24, label: 'Copper tide' },
    currents: [{ x: 215, y: 215, w: 540, h: 100, dx: 44, dy: 10 }, { x: 650, y: 80, w: 90, h: 340, dx: 0, dy: -28 }],
    docks: [{ x: 475, y: 420, name: 'Copper shelter' }]
  },
  {
    name: 'The Last Reach', subtitle: 'Four lights against the gathering storm.', limit: 145,
    tip: 'Heavy cargo turns slowly. Refill at the shelter before the eastern run.',
    keepers: [{ x: 360, y: 140, name: 'Ash' }, { x: 800, y: 140, name: 'Finch' }, { x: 815, y: 450, name: 'Fern' }, { x: 350, y: 450, name: 'Rook' }],
    islands: [{ x: 360, y: 78, r: 42 }, { x: 805, y: 78, r: 40 }, { x: 825, y: 390, r: 40 }, { x: 350, y: 390, r: 39 }, { x: 590, y: 255, r: 43 }],
    reefs: [{ x: 450, y: 218, r: 25 }, { x: 475, y: 285, r: 27 }, { x: 685, y: 350, r: 32 }, { x: 715, y: 220, r: 25 }],
    tide: { period: 30, label: 'Last Reach tide' },
    currents: [{ x: 200, y: 195, w: 600, h: 110, dx: 49, dy: 0 }, { x: 625, y: 80, w: 80, h: 390, dx: 0, dy: 38 }],
    docks: [{ x: 560, y: 420, name: 'Last shelter' }]
  }
];
