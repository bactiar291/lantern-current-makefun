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
  },
  {
    name: 'Willow Weir', subtitle: 'Read the timber lanes. Light the forgotten signal posts.', limit: 155,
    tip: 'Dashed copper lanes warn for 2 seconds. Cross behind the timber, or take the outer banks.',
    keepers: [{x:320,y:145,name:'Ibis'},{x:800,y:170,name:'Lark'},{x:785,y:440,name:'Elm'}],
    islands: [{x:320,y:80,r:40},{x:810,y:105,r:40},{x:795,y:375,r:40},{x:470,y:260,r:45},{x:600,y:330,r:35}],
    reefs: [{x:470,y:380,r:25},{x:600,y:180,r:27}],
    tide: {period:28,label:'Weir tide'},
    currents: [{x:240,y:200,w:550,h:90,dx:46,dy:0}],
    docks: [{x:560,y:440,name:'Weir refuge'}],
    beacons: [{x:430,y:95,name:'North signal'},{x:865,y:290,name:'East signal'}],
    driftwood: [
      {from:{x:250,y:220},to:{x:390,y:430},period:18,duration:8,offset:0,r:16},
      {from:{x:710,y:200},to:{x:710,y:440},period:20,duration:9,offset:9,r:16}
    ]
  },
  {
    name: 'The Splitwater', subtitle: 'A spine of stone. Choose a bank, then commit.', limit: 165,
    tip: 'The stone spine divides the river. The south gate is open; the north gate carries driftwood.',
    keepers: [{x:340,y:450,name:'Alder'},{x:780,y:150,name:'Tern'},{x:825,y:450,name:'Sedge'},{x:610,y:275,name:'Flint'}],
    islands: [{x:350,y:385,r:40},{x:790,y:85,r:41},{x:835,y:385,r:40},{x:610,y:210,r:40},{x:470,y:170,r:32},{x:470,y:280,r:32},{x:470,y:390,r:32}],
    reefs: [{x:700,y:320,r:26},{x:280,y:220,r:24}],
    tide: {period:22,label:'Split tide'},
    currents: [{x:360,y:80,w:90,h:350,dx:0,dy:40},{x:520,y:310,w:280,h:75,dx:-40,dy:0}],
    docks: [{x:590,y:440,name:'South gate refuge'}],
    beacons: [{x:285,y:100,name:'West signal'},{x:865,y:275,name:'Far signal'}],
    driftwood: [
      {from:{x:370,y:95},to:{x:680,y:95},period:17,duration:8,offset:0,r:15},
      {from:{x:730,y:210},to:{x:865,y:310},period:15,duration:7,offset:6,r:16},
      {from:{x:200,y:330},to:{x:390,y:330},period:19,duration:8,offset:11,r:15}
    ]
  },
  {
    name: 'Eye of the Storm', subtitle: 'Five lights. A sheltered heart inside a restless ring.', limit: 190,
    tip: 'The outer banks are safest. Rest at the central refuge before spending oil on the signals.',
    keepers: [{x:300,y:145,name:'Reed'},{x:790,y:145,name:'Wick'},{x:820,y:450,name:'Bracken'},{x:330,y:450,name:'Dove'},{x:570,y:280,name:'Rain'}],
    islands: [{x:300,y:80,r:40},{x:800,y:80,r:40},{x:830,y:385,r:40},{x:330,y:385,r:40},{x:570,y:215,r:39},{x:430,y:265,r:32},{x:710,y:265,r:32}],
    reefs: [{x:460,y:390,r:23},{x:680,y:390,r:23},{x:465,y:140,r:22},{x:670,y:140,r:22}],
    tide: {period:18,label:'Storm tide'},
    currents: [{x:230,y:185,w:570,h:70,dx:55,dy:0},{x:625,y:290,w:75,h:170,dx:0,dy:42},{x:230,y:440,w:510,h:55,dx:-32,dy:0}],
    docks: [{x:570,y:365,name:'Eye refuge'}],
    beacons: [{x:570,y:85,name:'Crown signal'},{x:890,y:295,name:'Storm signal'}],
    driftwood: [
      {from:{x:210,y:210},to:{x:370,y:300},period:16,duration:7,offset:0,r:16},
      {from:{x:750,y:220},to:{x:870,y:320},period:16,duration:7,offset:8,r:16},
      {from:{x:480,y:470},to:{x:660,y:470},period:18,duration:7,offset:4,r:16}
    ]
  }
];
export const VOYAGES = [{name:'Reedwater voyage',first:0,last:2,keepers:9},{name:'Storm Atlas',first:3,last:5,keepers:12}];
