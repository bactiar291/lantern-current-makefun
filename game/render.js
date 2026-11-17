import { STAGES, HOME } from './stages.js';
import { tideFactor } from './simulation.js';
import { driftwoodAt } from './hazards.js';
const INK = '#173f3a', PAPER = '#f3edda', COPPER = '#ad4c2e';
function path(ctx, points, fill, stroke = INK, width = 2) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill, stroke = null) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } }
function text(ctx, value, x, y, size = 12, color = INK, font = 'Arial') { ctx.fillStyle = color; ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.fillText(value, x, y); }
function island(ctx, x, y, r, seed = 0) {
  const points = Array.from({ length: 13 }, (_, i) => { const a = i / 13 * Math.PI * 2, radius = r * (1 + Math.sin(i * 2.7 + seed) * 0.13); return [x + Math.cos(a) * radius, y + Math.sin(a) * radius * 0.86]; });
  ctx.save(); ctx.translate(3, 7); path(ctx, points, '#629789', null); ctx.restore();
  path(ctx, points, '#deddbb');
  const inner = points.map(([px, py]) => [x + (px - x) * 0.85, y + (py - y) * 0.81]); path(ctx, inner, '#b7c49b', '#7a987c', 1);
  for (let i = 0; i < 7; i++) { const a = i * 2.4 + seed, px = x + Math.cos(a) * r * .53, py = y + Math.sin(a) * r * .42; ctx.strokeStyle = '#668969'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 4, py + 3); ctx.lineTo(px, py - 5); ctx.lineTo(px + 3, py + 3); ctx.stroke(); }
}
function lantern(ctx, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  circle(ctx, 0, 0, 13, '#e9cf8b55'); path(ctx, [[-4,-5],[4,-5],[5,5],[-5,5]], '#f6d589');
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-4, -5, 8, 10); ctx.beginPath(); ctx.arc(0,-6,3,Math.PI,0); ctx.stroke(); ctx.restore();
}
function lighthouse(ctx, saved, time, reduced) {
  island(ctx, 63, 224, 43, 5);
  ctx.save(); ctx.translate(65, 218);
  if (saved > 0) { ctx.save(); ctx.rotate(reduced ? -.5 : Math.sin(time * .15) * .35 - .5); path(ctx, [[0,-65],[420,-135],[420,20]], '#f5e9b135', null); ctx.restore(); }
  path(ctx, [[-15,17],[16,17],[10,-50],[-8,-50]], PAPER);
  path(ctx, [[-12,-8],[14,-1],[12,-16],[-10,-24]], COPPER, null);
  path(ctx, [[-9,-39],[11,-31],[10,-45],[-8,-51]], COPPER, null);
  path(ctx, [[-14,-50],[15,-50],[15,-67],[-14,-67]], PAPER);
  path(ctx, [[-18,-68],[0,-82],[19,-68]], COPPER);
  lantern(ctx, 0, -59, .9); ctx.fillStyle = INK; ctx.fillRect(-4, 1, 8, 16);
  ctx.restore();
  path(ctx, [[87,264],[121,264],[121,292],[87,292]], '#a87b52');
  for (let y = 269; y < 293; y += 7) { ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(87,y); ctx.lineTo(121,y); ctx.stroke(); }
  text(ctx, 'HOME', 64, 330, 13); text(ctx, 'LIGHTHOUSE', 64, 347, 9);
}
export function drawRiver(ctx, s, time, reduced = false) {
  const stage = STAGES[s.stage];
  const tide = tideFactor(stage, s.elapsed);
  ctx.clearRect(0,0,950,550); ctx.fillStyle = '#88b5a7'; ctx.fillRect(0,0,950,550);
  // Deterministic ink marks, not image assets or per-frame randomness.
  for (let i = 0; i < 155; i++) { const x = (i * 137.3) % 950, y = (i * 71.7) % 550; ctx.strokeStyle = i % 3 ? '#6fa394' : '#b3cbb3'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+7,y+3,x+15,y); ctx.stroke(); }
  for (const c of stage.currents) {
    ctx.fillStyle = '#4e8e7e18'; ctx.fillRect(c.x,c.y,c.w,c.h);
    for (let x=c.x+25;x<c.x+c.w;x+=57) for (let y=c.y+24;y<c.y+c.h;y+=41) {
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.atan2(c.dy,c.dx) + (tide < 0 ? Math.PI : 0));
      ctx.scale(Math.abs(tide), 1);
      const drift = reduced ? 0 : (s.elapsed * 10 % 14); ctx.translate(drift,0);
      ctx.strokeStyle = '#326d6080'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(12,0); ctx.lineTo(6,-4); ctx.moveTo(12,0); ctx.lineTo(6,4); ctx.stroke(); ctx.restore();
    }
  }
  text(ctx, s.stage<3?'R E E D W A T E R   A R C H I P E L A G O':'S T O R M   A T L A S   /   U N C H A R T E D   R E A C H E S', 481, 36, 10, '#386c5d');
  for(const lane of stage.driftwood || []) {
    const h=driftwoodAt(lane,s.elapsed);
    ctx.save();ctx.strokeStyle=h.phase==='warning'?COPPER:'#6b574e70';ctx.lineWidth=h.phase==='warning'?2:1;
    ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(lane.from.x,lane.from.y);ctx.lineTo(lane.to.x,lane.to.y);ctx.stroke();ctx.setLineDash([]);
    if(h.phase==='warning') {
      circle(ctx,lane.from.x,lane.from.y,22,'#f3edda99',COPPER);
      text(ctx,`! ${Math.ceil(h.countdown)}s`,lane.from.x,lane.from.y+4,11,COPPER);
    }
    if(h.solid) {
      ctx.translate(h.x,h.y);ctx.rotate(h.angle);
      ctx.strokeStyle='#e4e5c0';ctx.beginPath();ctx.moveTo(-28,-12);ctx.lineTo(-38,0);ctx.lineTo(-28,12);ctx.stroke();
      path(ctx,[[-19,-8],[15,-9],[23,-2],[18,8],[-16,9],[-22,2]],'#916447',INK,2);
      ctx.strokeStyle='#d7b58a';ctx.beginPath();ctx.moveTo(-14,-3);ctx.lineTo(14,-3);ctx.moveTo(-10,3);ctx.lineTo(18,3);ctx.stroke();
    }
    ctx.restore();
  }
  for (const [i, o] of stage.islands.entries()) island(ctx,o.x,o.y,o.r,i+2);
  for (const r of stage.reefs) {
    ctx.strokeStyle = '#3c716566'; ctx.setLineDash([3,5]); ctx.beginPath(); ctx.ellipse(r.x,r.y,r.r+9,r.r*.73+7,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    for (let i=0;i<3;i++) { const x=r.x+(i-1)*16,y=r.y+Math.sin(i*2)*10; path(ctx,[[x-12,y+8],[x-3,y-13],[x+6,y-8],[x+12,y+9]], '#667e70'); path(ctx,[[x-3,y-13],[x+1,y+3],[x+12,y+9]], '#819081',null); }
  }
  lighthouse(ctx,s.totalSaved,time,reduced);
  for(const [id,p] of (stage.beacons || []).entries()) {
    const lit=s.litBeacons.includes(id);
    circle(ctx,p.x,p.y,28,lit?'#f9df8c77':'#e9e2c144',lit?COPPER:'#617365');
    path(ctx,[[p.x-12,p.y+10],[p.x+12,p.y+10],[p.x+8,p.y+17],[p.x-8,p.y+17]],'#b8895f');
    ctx.fillStyle=INK;ctx.fillRect(p.x-2,p.y-17,4,28);
    if(lit)lantern(ctx,p.x,p.y-20,1.3);else {circle(ctx,p.x,p.y-20,7,'#c6bd9c',INK);}
    text(ctx,lit?'SIGNAL LIT':'SIGNAL · 20 OIL',p.x,p.y+39,9,lit?COPPER:INK);
  }
  for (const d of stage.docks) {
    circle(ctx,d.x,d.y,36,'#e4e0bd44');
    path(ctx,[[d.x-21,d.y-13],[d.x+21,d.y-13],[d.x+21,d.y+12],[d.x-21,d.y+12]], '#b8895f');
    for(let x=d.x-14;x<d.x+22;x+=8){ctx.strokeStyle=INK;ctx.beginPath();ctx.moveTo(x,d.y-13);ctx.lineTo(x,d.y+12);ctx.stroke();}
    path(ctx,[[d.x-8,d.y-13],[d.x-8,d.y-36],[d.x+16,d.y-29],[d.x-8,d.y-23]], INK);
    text(ctx,'+ SHELTER',d.x,d.y+33,11); text(ctx,'OIL & REPAIR',d.x,d.y+47,8);
  }
  for (const k of s.keepers) {
    if (k.status !== 'waiting') continue;
    circle(ctx,k.x,k.y,30,'#f4e4b04a');
    ctx.strokeStyle = '#b06a43'; ctx.lineWidth=1; ctx.beginPath();ctx.arc(k.x,k.y,30,0,Math.PI*2);ctx.stroke();
    path(ctx,[[k.x-18,k.y+8],[k.x+18,k.y+8],[k.x+18,k.y+18],[k.x-18,k.y+18]], '#b88c61');
    circle(ctx,k.x,k.y-12,5,INK);path(ctx,[[k.x-7,k.y+6],[k.x-4,k.y-5],[k.x+4,k.y-5],[k.x+8,k.y+6]],COPPER);
    lantern(ctx,k.x+14,k.y-6 + (reduced ? 0 : Math.sin(time*2+k.id)*1.5));
    text(ctx,k.name.toUpperCase(),k.x,k.y+43,10);
  }
  const b=s.boat;
  ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.angle);
  if (Math.hypot(b.vx,b.vy)>15) { ctx.strokeStyle='#e6e8c8';ctx.lineWidth=2; for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-22-i*10,-8-i*3);ctx.quadraticCurveTo(-17-i*10,0,-22-i*10,8+i*3);ctx.stroke();} }
  ctx.globalAlpha=s.invulnerable>0 && Math.floor(time*12)%2 ? .5:1;
  path(ctx,[[24,0],[-12,-12],[-22,-6],[-22,6],[-12,12]],PAPER,INK,2.5);
  path(ctx,[[24,0],[-11,0],[-19,8]],'#d6c494',null);
  ctx.strokeStyle=COPPER;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,-10);ctx.lineTo(-7,10);ctx.stroke();
  circle(ctx,3,0,4,INK); for(let i=0;i<s.cargo.length;i++) lantern(ctx,-13+i*11,0,.6);
  ctx.restore();
  if(s.dockTarget){ctx.strokeStyle=COPPER;ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,32,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,s.dockTime/(s.dockTarget.startsWith('beacon')?1.2:.65)));ctx.stroke(); text(ctx,'HOLD SPACE',b.x,b.y+48,9);}
  // A chartmaker's compass and scale keep the sea feeling like a physical map.
  ctx.save();ctx.translate(891,477);path(ctx,[[0,-25],[5,-4],[0,0],[-5,4]],PAPER);path(ctx,[[0,25],[-5,4],[0,0],[5,-4]],INK);text(ctx,'N',0,-33,10);ctx.restore();
  text(ctx,'0 ───── 100 river lengths',150,520,9,'#386c5d');
}
