const VERSION = 1;
export const LOGBOOK_KEY = 'lantern-current-logbook-v1';

function blank(count) {
  return { version: VERSION, completed: Array(count).fill(false), bestScores: Array(count).fill(null), medals: Array(count).fill(0) };
}

function validScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1000000;
}

export function emptyLogbook(count) { return blank(count); }

export function sanitizeLogbook(value, count) {
  if (count === 6 && value?.completed?.length === 3 && value?.bestScores?.length === 3) {
    const old = sanitizeLogbook(value,3);
    return { ...old, completed:old.completed.concat([false,false,false]), bestScores:old.bestScores.concat([null,null,null]), medals:old.medals.concat([0,0,0]) };
  }
  if (!value || value.version !== VERSION || !Array.isArray(value.completed) || !Array.isArray(value.bestScores) ||
      value.completed.length !== count || value.bestScores.length !== count ||
      !value.completed.every((item, i) => typeof item === 'boolean' &&
        (item ? validScore(value.bestScores[i]) && (i === 0 || value.completed[i - 1]) : value.bestScores[i] === null))) return blank(count);
  const medals = value.medals === undefined ? Array(count).fill(0) : value.medals;
  if (!Array.isArray(medals) || medals.length !== count || !medals.every((v,i)=>Number.isInteger(v) && v>=0 && v<=2 && (v===0 || (i>=3 && value.completed[i])))) return blank(count);
  return { version: VERSION, completed: [...value.completed], bestScores: [...value.bestScores], medals:[...medals] };
}

export function loadLogbook(storage, count = 3) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    const raw = storage?.getItem(LOGBOOK_KEY);
    return sanitizeLogbook(raw === null ? null : JSON.parse(raw), count);
  } catch { return blank(count); }
}

export function saveLogbook(logbook, storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(LOGBOOK_KEY, JSON.stringify(logbook)); return true;
  } catch { return false; }
}

export function isUnlocked(logbook, chart) {
  return Number.isInteger(chart) && chart >= 0 && chart < logbook.completed.length && (chart === 0 || logbook.completed[chart - 1] === true);
}

export function recordCompletion(logbook, chart, score, storage) {
  if (!isUnlocked(logbook, chart) || !validScore(score)) return false;
  const changed = !logbook.completed[chart] || logbook.bestScores[chart] === null || score > logbook.bestScores[chart];
  logbook.completed[chart] = true;
  if (changed) logbook.bestScores[chart] = score;
  if (changed) saveLogbook(logbook, storage);
  return changed;
}

export function recordMedal(logbook, chart, medal, storage) {
  if (!isUnlocked(logbook,chart) || !logbook.completed[chart] || chart<3 || !Number.isInteger(medal) || medal<1 || medal>2 || medal<=logbook.medals[chart]) return false;
  logbook.medals[chart]=medal; saveLogbook(logbook,storage); return true;
}
export function resetLogbook(logbook, storage) {
  Object.assign(logbook,blank(logbook.completed.length));
  return saveLogbook(logbook,storage);
}
