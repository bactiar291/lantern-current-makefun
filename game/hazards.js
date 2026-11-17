// A lane always warns before a log enters. Simulation time alone drives its phase.
export function driftwoodAt(lane, elapsed) {
  const phaseTime = ((elapsed + lane.offset) % lane.period + lane.period) % lane.period;
  const phase = phaseTime < 2 ? 'warning' : phaseTime < 2 + lane.duration ? 'crossing' : 'clear';
  const progress = Math.max(0, Math.min(1, (phaseTime - 2) / lane.duration));
  return { x: lane.from.x + (lane.to.x-lane.from.x)*progress,
    y: lane.from.y + (lane.to.y-lane.from.y)*progress, r: lane.r,
    angle: Math.atan2(lane.to.y-lane.from.y,lane.to.x-lane.from.x),
    phase, solid: phase === 'crossing', countdown: phase === 'warning' ? 2-phaseTime : lane.period-phaseTime };
}
export function hazardsAt(chart, elapsed) { return (chart.driftwood || []).map(lane=>driftwoodAt(lane,elapsed)); }
