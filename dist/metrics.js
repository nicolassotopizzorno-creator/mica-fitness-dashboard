export const number = v => typeof v === 'number' && Number.isFinite(v);
export const sum = a => a.reduce((s,v)=>s+v,0);
export const mean = a => a.length ? sum(a)/a.length : null;
export const auto = s => s.automatic || {};
export const manual = s => s.manual || {};
export const sessionDate = s => auto(s).started_at_local || manual(s).performed_at_local || null;
export const activityName = s => auto(s).activity || manual(s).activity || 'Actividad sin identificar';
export const exercises = s => manual(s).exercises || [];
export const sets = e => e.sets || [];
export const setCount = e => { const values=sets(e).map(s=>s.set_count).filter(number);return values.length?sum(values):null; };
export const sessionSetCount = s => {const v=exercises(s).map(setCount).filter(number);return v.length?sum(v):null;};
// Only unambiguous total external load is additive. Unknown load basis stays unknown.
export const setVolume = s => number(s.set_count)&&number(s.reps)&&number(s.load_kg)&&s.load_basis==='total_external' ? s.set_count*s.reps*s.load_kg : null;
export function volume(sessions) {
  const all=sessions.flatMap(s=>exercises(s).flatMap(sets));
  const known=all.map(setVolume).filter(number);
  return {value:known.length?sum(known):null,complete:all.length>0&&known.length===all.length,known:known.length,total:all.length};
}
export function totals(sessions) {
  const values = fn => sessions.map(fn).filter(number);
  const metric = (fn,reduce=sum) => {const v=values(fn);return {value:v.length?reduce(v):null,count:v.length};};
  return {
    sessions:sessions.length,
    duration:metric(s=>auto(s).duration_seconds),
    activeCalories:metric(s=>auto(s).active_calories_kcal),
    totalCalories:metric(s=>auto(s).total_calories_kcal),
    averageHR:metric(s=>auto(s).heart_rate?.average_bpm,mean),
    maxHR:metric(s=>auto(s).heart_rate?.max_bpm,v=>Math.max(...v)),
    rpe:metric(s=>manual(s).rpe,mean),
    exercises:sessions.reduce((n,s)=>n+exercises(s).length,0),
    sets:metric(sessionSetCount),
    volume:volume(sessions)
  };
}
export function exerciseRows(sessions,catalogId) {
  return sessions.flatMap(session=>exercises(session).filter(e=>(e.catalog_id||e.id)===catalogId).flatMap(exercise=>sets(exercise).map(set=>({session,exercise,set,date:sessionDate(session)}))));
}
export function personalBests(rows) {
  const groups=new Map();
  for (const row of rows) {
    const {set}=row;
    if (!number(set.load_kg)||!set.load_basis||set.load_basis==='unknown')continue;
    const old=groups.get(set.load_basis);
    if (!old||set.load_kg>old.set.load_kg)groups.set(set.load_basis,row);
  }
  return [...groups.values()];
}
export function groupedZones(sessions) {
  const groups=new Map();
  for(const s of sessions)for(const z of auto(s).zones||[]){
    if(!number(z.seconds))continue;
    // Never merge different BPM boundaries under the same zone label.
    const key=JSON.stringify([z.name,z.lower_bpm??null,z.upper_bpm??null]);
    if(!groups.has(key))groups.set(key,{...z,seconds:0});
    groups.get(key).seconds+=z.seconds;
  }
  return [...groups.values()];
}
