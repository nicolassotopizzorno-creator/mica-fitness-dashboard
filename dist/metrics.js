export const number = v => typeof v === 'number' && Number.isFinite(v);
export const sum = a => a.reduce((s,v)=>s+v,0);
export const mean = a => a.length ? sum(a)/a.length : null;
export const auto = s => s.automatic || {};
export const manual = s => s.manual || {};
export const sessionDate = s => auto(s).started_at_local || manual(s).performed_at_local || null;
export const sessionDay = s => sessionDate(s)?.slice(0,10) || null;
export const activityName = s => auto(s).activity || manual(s).activity || 'Actividad sin identificar';
export const activityKey = s => {
  const text=activityName(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(entrenamiento|clase|de)\b/g,'').trim();
  if(/^(gym|gimnasio|musculacion|pesas)$/.test(text))return 'gimnasio';
  if(text==='pilates')return 'pilates';
  if(text==='funcional')return 'funcional';
  return text;
};
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
  if(!sessions.length)return [];
  if(sessions.length>1){
    const signatures=sessions.map(s=>(auto(s).zones||[]).map(z=>{
      if(!number(z.lower_bpm)||!number(z.upper_bpm)||!number(z.seconds))return null;
      return JSON.stringify([z.name,z.lower_bpm,z.upper_bpm]);
    }).sort());
    if(signatures.some(v=>!v.length||v.some(x=>x===null)||JSON.stringify(v)!==JSON.stringify(signatures[0])))return [];
  }
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
export function dailyTraining(sessions){
  const days=new Map();
  for(const s of sessions){
    const day=sessionDay(s);if(!day)continue;
    if(!days.has(day))days.set(day,{date:day,sessions:[],count:0,duration_seconds:null,duration_complete:false,active_calories_kcal:null,calories_complete:false,max_bpm:null,average_bpm:null,zones:[]});
    const row=days.get(day);row.sessions.push(s);row.count++;
  }
  return [...days.values()].map(row=>{
    const accumulate=fn=>{const v=row.sessions.map(fn).filter(number);return v.length?sum(v):null;};
    row.duration_seconds=accumulate(s=>auto(s).duration_seconds);
    row.duration_complete=row.sessions.every(s=>number(auto(s).duration_seconds));
    row.active_calories_kcal=accumulate(s=>auto(s).active_calories_kcal);
    row.calories_complete=row.sessions.every(s=>number(auto(s).active_calories_kcal));
    const peaks=row.sessions.map(s=>auto(s).heart_rate?.max_bpm).filter(number);
    row.max_bpm=peaks.length?Math.max(...peaks):null;
    const weighted=row.sessions.map(s=>({duration:auto(s).duration_seconds,average:auto(s).heart_rate?.average_bpm}));
    if(weighted.every(x=>number(x.duration)&&x.duration>0&&number(x.average)))row.average_bpm=sum(weighted.map(x=>x.duration*x.average))/sum(weighted.map(x=>x.duration));
    row.zones=groupedZones(row.sessions);
    return row;
  }).sort((a,b)=>a.date.localeCompare(b.date));
}
export function evolutionSeries(sessions,dailyActivity=[]){
  const days=dailyTraining(sessions);
  const points=(rows,value)=>rows.map(row=>({date:row.date,value:value(row)}));
  return {
    time:points(days.filter(d=>d.duration_complete&&number(d.duration_seconds)),d=>d.duration_seconds),
    sessions:points(days,d=>d.count),
    steps:points(dailyActivity.filter(d=>d.date&&number(d.steps?.value)).sort((a,b)=>a.date.localeCompare(b.date)),d=>d.steps.value),
    calories:points(days.filter(d=>d.calories_complete&&number(d.active_calories_kcal)),d=>d.active_calories_kcal)
  };
}
export function latestDayComparison(sessions,dailyActivity=[]){
  const days=dailyTraining(sessions);
  if(days.length<2)return null;
  const current=days.at(-1),previous=days.at(-2);
  const byDate=new Map(dailyActivity.map(d=>[d.date,d]));
  const steps=d=>byDate.get(d.date)?.steps?.value;
  return {current:current.date,previous:previous.date,metrics:{
    sessions:[current.count,previous.count],
    time:current.duration_complete&&previous.duration_complete?[current.duration_seconds,previous.duration_seconds]:null,
    steps:number(steps(current))&&number(steps(previous))?[steps(current),steps(previous)]:null,
    calories:current.calories_complete&&previous.calories_complete?[current.active_calories_kcal,previous.active_calories_kcal]:null
  }};
}
export function trainingEffectSeries(sessions){
  const groups=new Map();
  for(const session of sessions){
    const date=sessionDay(session);if(!date)continue;
    for(const effect of auto(session).training_effect||[]){
      if(!number(effect.value))continue;
      const key=JSON.stringify([effect.key||effect.label,effect.unit??null,effect.scale??null]);
      if(!groups.has(key))groups.set(key,{key,label:effect.label,unit:effect.unit??null,scale:effect.scale??null,points:[]});
      groups.get(key).points.push({date,value:effect.value,session_id:session.id,activity:activityName(session)});
    }
  }
  return [...groups.values()].map(group=>({...group,points:group.points.sort((a,b)=>a.date.localeCompare(b.date)||String(a.session_id).localeCompare(String(b.session_id)))}));
}
export function latestComparable(sessions){
  const ordered=sessions.filter(sessionDate).sort((a,b)=>sessionDate(b).localeCompare(sessionDate(a)));
  if(ordered.length<2)return null;
  const latest=ordered[0],key=activityKey(latest);
  const previous=ordered.slice(1).find(s=>activityKey(s)===key);
  return previous?{latest,previous}:null;
}
export function weeklyActivity(sessions,dailyActivity=[]){
  const groups=new Map();
  const weekOf=date=>{
    const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);
  };
  for(const row of dailyTraining(sessions)){
    const key=weekOf(row.date);
    if(!groups.has(key))groups.set(key,{week:key,sessions:0,activeDays:0,duration_seconds:0,durationDays:0,durationCompleteDays:0,steps:[],goalsMet:0,goalsKnown:0});
    const g=groups.get(key);g.sessions+=row.count;g.activeDays++;if(number(row.duration_seconds)){g.duration_seconds+=row.duration_seconds;g.durationDays++;if(row.duration_complete)g.durationCompleteDays++;}
  }
  for(const day of dailyActivity){
    if(!day.date)continue;const key=weekOf(day.date);
    if(!groups.has(key))groups.set(key,{week:key,sessions:0,activeDays:0,duration_seconds:0,durationDays:0,durationCompleteDays:0,steps:[],goalsMet:0,goalsKnown:0});
    const g=groups.get(key),steps=day.steps?.value,goal=day.step_goal?.value;
    if(number(steps)){g.steps.push(steps);if(number(goal)){g.goalsKnown++;if(steps>=goal)g.goalsMet++;}}
  }
  return [...groups.values()].sort((a,b)=>a.week.localeCompare(b.week));
}
