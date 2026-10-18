import {number,sum,auto,manual,sessionDate,sessionDay,activityName,exercises,sets,sessionSetCount,volume,exerciseRows,personalBests,groupedZones,dailyTraining,evolutionSeries,latestDayComparison,trainingEffectSeries,latestComparable,weeklyActivity} from './metrics.js';

const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:d}).format(n);
const duration=n=>number(n)?(Math.floor(n/3600)?Math.floor(n/3600)+' h ':'')+Math.floor((n%3600)/60)+' min'+(n%60?' '+fmt(n%60)+' s':''):null;
const dayLabel=s=>s?s.slice(8,10)+'/'+s.slice(5,7):'—';
const date=s=>s?dayLabel(s)+'/'+s.slice(0,4)+(s.length>10?' · '+s.slice(11,16):''):'Fecha no informada';
const unit=(n,u)=>number(n)?fmt(n,1)+' '+u:null;
const basis={total_external:'carga externa total',per_hand:'por mano',machine:'máquina',bodyweight:'peso corporal',unknown:'base no informada'};
const sourceName=s=>s==='mi_fitness_screenshot'?'Mi Fitness':'Informado por Mica';
let db;

function section(title,body,extraClass=''){return '<section class="section '+extraClass+'"><h2>'+escape(title)+'</h2>'+body+'</section>';}
function metric(label,value,suffix='',note=''){return '<article class="metric"><div class="label">'+escape(label)+'</div><div class="value">'+escape(value)+(suffix?' <small>'+escape(suffix)+'</small>':'')+'</div>'+(note?'<div class="note">'+escape(note)+'</div>':'')+'</article>';}
function mainCards(days){
  const s=db.sessions,steps=[...(db.daily_activity||[])].filter(d=>number(d.steps?.value)).sort((a,b)=>b.date.localeCompare(a.date));
  let out='';
  if(days.length)out+=metric('Días activos',days.length);
  if(s.length)out+=metric('Sesiones',s.length);
  const seconds=s.map(x=>auto(x).duration_seconds).filter(number);
  if(seconds.length)out+=metric('Horas entrenadas',fmt(sum(seconds)/3600,1),'h',seconds.length<s.length?'Total parcial':'');
  if(steps.length){const last=steps[0],goal=last.step_goal?.value;out+=metric('Últimos pasos',fmt(last.steps.value),'',date(last.date)+(number(goal)?' · Meta '+fmt(goal):''));}
  return out?'<div class="metrics primary-metrics'+(steps.length?' has-steps':'')+'">'+out+'</div>':'';
}
function secondaryCards(){
  const s=db.sessions;if(!s.length)return '';
  const vals=fn=>s.map(fn).filter(number);
  let out='';
  const kcal=vals(x=>auto(x).active_calories_kcal);if(kcal.length)out+=metric('Calorías de actividad',fmt(sum(kcal)),'kcal',kcal.length<s.length?'Total parcial':kcal.length+' '+(kcal.length===1?'sesión':'sesiones'));
  const peaks=vals(x=>auto(x).heart_rate?.max_bpm);if(peaks.length)out+=metric('FC máxima registrada',fmt(Math.max(...peaks)),'lpm');
  const rpe=vals(x=>manual(x).rpe);if(rpe.length)out+=metric('Esfuerzo percibido',fmt(sum(rpe)/rpe.length,1),'/ 10',rpe.length+' sesiones');
  const v=volume(s);if(number(v.value))out+=metric(v.complete?'Volumen registrado':'Volumen parcial',fmt(v.value),'kg·rep');
  return out?section('Otros indicadores','<div class="metrics">'+out+'</div>','compact'):'';
}
const evolutionMetrics=[
  {key:'time',label:'Tiempo activo',format:v=>duration(v)},
  {key:'sessions',label:'Sesiones',format:v=>fmt(v)+' '+(v===1?'sesión':'sesiones')},
  {key:'steps',label:'Pasos',format:v=>fmt(v)+' pasos'},
  {key:'calories',label:'Calorías',format:v=>fmt(v)+' kcal'}
];
let selectedEvolution='time';
function evolutionChart(points,config){
  const W=500,H=190,L=11,R=11,T=20,B=13,plotW=W-L-R,plotH=H-T-B;
  const times=points.map(p=>Date.parse(p.date+'T12:00:00Z'));
  const minTime=times[0],span=times.at(-1)-minTime||1;
  const max=Math.max(1,...points.map(p=>p.value)),ceiling=max*1.18;
  const x=i=>points.length===1?L+plotW/2:L+(times[i]-minTime)/span*plotW;
  const y=v=>T+plotH-v/ceiling*plotH;
  const pointLabel=p=>date(p.date)+(p.activity?' · '+p.activity:'');
  let svg='<svg class="evolution-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+escape(config.label+' por fecha')+'"><title>'+escape(points.map(p=>pointLabel(p)+': '+config.format(p.value)).join('; '))+'</title>';
  for(const ratio of [0,.5,1]){const yy=y(ceiling*ratio);svg+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#e9e1df" stroke-dasharray="3 5"/>';}
  svg+='<polyline points="'+points.map((p,i)=>x(i)+','+y(p.value)).join(' ')+'" fill="none" stroke="#966f79" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
  points.forEach((p,i)=>{svg+='<circle cx="'+x(i)+'" cy="'+y(p.value)+'" r="5" fill="#966f79" stroke="#fffdfa" stroke-width="2"><title>'+escape(pointLabel(p)+': '+config.format(p.value))+'</title></circle>';});
  svg+='</svg>';
  svg+='<div class="evolution-axis"><span>'+escape(dayLabel(points[0].date))+'</span><span>Fecha</span><span>'+escape(dayLabel(points.at(-1).date))+'</span></div>';
  const last=points.at(-1);
  const values='<div class="evolution-latest"><span>Último dato · '+escape(date(last.date))+'</span><strong>'+escape(config.format(last.value))+'</strong></div>';
  const table='<details class="evolution-table"><summary>Ver valores por fecha</summary><div class="scroll"><table><thead><tr><th>Fecha</th><th>'+escape(config.label)+'</th></tr></thead><tbody>'+points.map(p=>'<tr><td>'+escape(pointLabel(p))+'</td><td>'+escape(config.format(p.value))+'</td></tr>').join('')+'</tbody></table></div></details>';
  return svg+values+table;
}
function dayComparisonCompact(){
  const pair=latestDayComparison(db.sessions,db.daily_activity||[]);if(!pair)return '';
  const configurations=[
    {key:'sessions',label:'Sesiones',format:v=>fmt(v)+' '+(v===1?'sesión':'sesiones'),delta:v=>fmt(v)+' '+(Math.abs(v)===1?'sesión':'sesiones')},
    {key:'time',label:'Tiempo activo',format:duration,delta:duration},
    {key:'steps',label:'Pasos',format:v=>fmt(v)+' pasos',delta:v=>fmt(v)+' pasos'},
    {key:'calories',label:'Calorías de actividad',format:v=>fmt(v)+' kcal',delta:v=>fmt(v)+' kcal'}
  ];
  const cards=configurations.filter(c=>pair.metrics[c.key]).map(c=>{
    const [current,previous]=pair.metrics[c.key],difference=current-previous;
    const change=difference===0?'0 '+(c.key==='time'?'min':c.key==='sessions'?'sesiones':c.key==='steps'?'pasos':'kcal'):(difference>0?'+':'−')+c.delta(Math.abs(difference));
    return '<div class="day-compare-card"><small>'+escape(c.label)+'</small><strong>'+escape(c.format(current))+'</strong><span>'+escape(change)+' vs '+escape(dayLabel(pair.previous))+'</span></div>';
  }).join('');
  return '<div class="day-compare"><div class="day-compare-heading"><h3>Último día vs anterior</h3><span>'+escape(dayLabel(pair.current))+' · '+escape(dayLabel(pair.previous))+'</span></div><div class="day-compare-grid">'+cards+'</div></div>';
}
function evolutionPanel(){
  const series=evolutionSeries(db.sessions,db.daily_activity||[]);
  const available=evolutionMetrics.filter(c=>series[c.key].length>=2);
  const comparison=dayComparisonCompact();
  if(!available.length&&!comparison)return '';
  let body='';
  if(available.length){
    const active=available.find(c=>c.key===selectedEvolution)||available[0];
    selectedEvolution=active.key;
    body+='<div class="metric-switch" role="group" aria-label="Métrica de evolución">'+available.map(c=>'<button type="button" data-evolution="'+c.key+'" aria-pressed="'+(c.key===active.key)+'">'+escape(c.label)+'</button>').join('')+'</div><div id="evolutionPlot">'+evolutionChart(series[active.key],active)+'</div>';
  }
  return section('Evolución',body+comparison,'evolution');
}
function bindEvolution(){
  const series=evolutionSeries(db.sessions,db.daily_activity||[]);
  document.querySelectorAll('[data-evolution]').forEach(button=>button.onclick=()=>{
    selectedEvolution=button.dataset.evolution;
    document.querySelectorAll('[data-evolution]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    const config=evolutionMetrics.find(c=>c.key===selectedEvolution);
    $('#evolutionPlot').innerHTML=evolutionChart(series[selectedEvolution],config);
  });
}
function sessionList(days){
  if(!days.length)return '';
  let html='';
  for(const d of [...days].reverse()){
    html+='<div class="activity-day"><strong>'+escape(date(d.date))+'</strong><small>'+d.count+' '+(d.count===1?'actividad':'actividades')+(number(d.duration_seconds)?' · '+escape(duration(d.duration_seconds))+(d.duration_complete?'':' (parcial)'):'')+'</small>';
    for(const s of [...d.sessions].sort((a,b)=>(sessionDate(a)||'').localeCompare(sessionDate(b)||''))){
      html+='<button class="session" data-session="'+escape(s.id)+'"><span><b>'+escape(activityName(s))+'</b><small>'+escape(sessionDate(s)?.length>10?sessionDate(s).slice(11,16):'Hora no informada')+(number(auto(s).duration_seconds)?' · '+escape(duration(auto(s).duration_seconds)):'')+'</small></span><span class="arrow" aria-hidden="true">↗</span></button>';
    }
    html+='</div>';
  }
  return '<details class="section workout-disclosure"><summary><span>Últimos entrenamientos</span><small>'+db.sessions.length+' '+(db.sessions.length===1?'sesión':'sesiones')+'</small><span class="disclosure-arrow" aria-hidden="true">⌄</span></summary><div class="workout-list">'+html+'</div></details>';
}
function compareRows(headA,headB,rows){
  const valid=rows.filter(r=>r[1]!=null&&r[2]!=null);
  if(!valid.length)return '';
  return '<div class="compare-heading"><span>Dato</span><span>'+escape(headA)+'</span><span>'+escape(headB)+'</span></div>'+valid.map(r=>'<div class="compare"><span>'+escape(r[0])+'</span><strong>'+escape(r[1])+'</strong><strong>'+escape(r[2])+'</strong></div>').join('');
}
function activityComparison(){
  const pair=latestComparable(db.sessions);if(!pair)return '';
  const a=pair.latest,b=pair.previous;
  const rows=[
    ['Duración',duration(auto(a).duration_seconds),duration(auto(b).duration_seconds)],
    ['Calorías de actividad',unit(auto(a).active_calories_kcal,'kcal'),unit(auto(b).active_calories_kcal,'kcal')],
    ['FC media',unit(auto(a).heart_rate?.average_bpm,'lpm'),unit(auto(b).heart_rate?.average_bpm,'lpm')],
    ['FC máxima',unit(auto(a).heart_rate?.max_bpm,'lpm'),unit(auto(b).heart_rate?.max_bpm,'lpm')],
    ['Esfuerzo percibido',unit(manual(a).rpe,'/ 10'),unit(manual(b).rpe,'/ 10')],
    ['Ejercicios',exercises(a).length||null,exercises(b).length||null],
    ['Series',sessionSetCount(a),sessionSetCount(b)]
  ];
  const av=volume([a]),bv=volume([b]);if(av.complete&&bv.complete)rows.push(['Volumen',unit(av.value,'kg·rep'),unit(bv.value,'kg·rep')]);
  const loadBy=s=>{
    const result=new Map();
    for(const e of exercises(s))for(const set of sets(e)){
      if(!e.catalog_id||!number(set.load_kg)||!set.load_basis||set.load_basis==='unknown')continue;
      const key=e.catalog_id+'|'+set.load_basis,old=result.get(key);
      if(!old||set.load_kg>old.load)result.set(key,{name:e.name||e.name_original,load:set.load_kg,basis:set.load_basis});
    }
    return result;
  };
  const la=loadBy(a),lb=loadBy(b);
  for(const [key,v] of la)if(lb.has(key))rows.push([v.name+' · '+(basis[v.basis]||v.basis),unit(v.load,'kg'),unit(lb.get(key).load,'kg')]);
  const body=compareRows(dayLabel(sessionDay(a)),dayLabel(sessionDay(b)),rows);
  return body?section('Última actividad vs anterior · '+activityName(a),body):'';
}
function weeklyPanel(days){
  const allDays=new Set([...days.map(d=>d.date),...(db.daily_activity||[]).filter(d=>number(d.steps?.value)).map(d=>d.date)]);
  const weeks=weeklyActivity(db.sessions,db.daily_activity||[]);
  if(allDays.size<3||weeks.length<2)return '';
  const html=[...weeks].reverse().map(w=>{
    let bits=[];if(w.sessions)bits.push(w.sessions+' sesiones',w.activeDays+' días activos');
    if(w.durationDays)bits.push(duration(w.duration_seconds)+(w.durationCompleteDays<w.activeDays?' (parcial)':''));
    if(w.steps.length)bits.push('Pasos: '+fmt(sum(w.steps)/w.steps.length));
    if(w.goalsKnown)bits.push('Meta: '+w.goalsMet+'/'+w.goalsKnown+' días');
    return '<div class="week-row"><strong>Semana del '+escape(date(w.week))+'</strong><div class="week-metrics">'+bits.map(v=>'<span>'+escape(v)+'</span>').join('')+'</div></div>';
  }).join('');
  return section('Constancia por semana',html);
}
function zonesPanel(sessions,individual=false){
  const zones=groupedZones(sessions);if(!zones.length)return '';
  const total=sum(zones.map(z=>z.seconds));
  const body=zones.map(z=>'<div class="zone"><div class="zone-title"><span>'+escape(z.name)+(number(z.lower_bpm)&&number(z.upper_bpm)?' · '+escape(z.lower_bpm)+'–'+escape(z.upper_bpm)+' lpm':'')+'</span><strong>'+escape(duration(z.seconds))+'</strong></div><div class="zone-bar"><span style="width:'+(total?z.seconds/total*100:0)+'%"></span></div></div>').join('');
  return section(individual?'Zonas de esta sesión':'Tiempo acumulado por zonas',body);
}
function effectsPanel(sessions,individual=false){
  const entries=sessions.flatMap(s=>(auto(s).training_effect||[]).filter(e=>e.value!=null).map(e=>({date:sessionDay(s),name:e.label,value:e.value,unit:e.unit,scale:e.scale})));
  if(!entries.length)return '';
  if(individual)return section('Efecto del entrenamiento',entries.map(e=>'<div class="effect-row"><span><strong>'+escape(e.name)+'</strong></span><span class="effect-value">'+escape(e.value)+(e.unit?' '+escape(e.unit):'')+(e.scale?'<small> / '+escape(e.scale)+'</small>':'')+'</span></div>').join(''));
  const groups=trainingEffectSeries(sessions);if(!groups.length)return '';
  const active=groups.find(g=>g.key===selectedEffect)||groups[0];selectedEffect=active.key;
  const buttons=groups.length>1?'<div class="metric-switch effect-switch" role="group" aria-label="Tipo de efecto">'+groups.map(g=>'<button type="button" data-effect="'+escape(g.key)+'" aria-pressed="'+(g.key===active.key)+'">'+escape(g.label)+'</button>').join('')+'</div>':'';
  return section('Efecto del entrenamiento',buttons+'<div id="effectPlot">'+effectChart(active)+'</div>');
}
let selectedEffect=null;
function effectChart(group){
  const config={label:group.label,format:v=>fmt(v,1)+(group.unit?' '+group.unit:'')};
  return '<div class="effect-caption">'+escape(group.label)+(group.scale?' · '+escape(group.scale):'')+'</div>'+evolutionChart(group.points,config);
}
function bindEffect(){
  const groups=trainingEffectSeries(db.sessions);
  document.querySelectorAll('[data-effect]').forEach(button=>button.onclick=()=>{
    selectedEffect=button.dataset.effect;
    document.querySelectorAll('[data-effect]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    const group=groups.find(g=>g.key===selectedEffect);
    if(group)$('#effectPlot').innerHTML=effectChart(group);
  });
}
function chart(title,points,unitName){
  const p=points.filter(x=>x.date&&number(x.value)).sort((a,b)=>a.date.localeCompare(b.date));
  if(p.length<2)return '';
  const max=Math.max(1,...p.map(x=>x.value)),min=Math.min(0,...p.map(x=>x.value));
  const at=p.map((x,i)=>[35+i/(p.length-1)*610,145-(x.value-min)/(max-min)*122]);
  const svg='<svg class="chart" viewBox="0 0 680 165" role="img" aria-label="'+escape(title)+'; valores exactos en el detalle"><line x1="35" y1="145" x2="645" y2="145" stroke="#e8e1dc"/><polyline fill="none" stroke="#966f79" stroke-width="2.5" points="'+at.map(x=>x.join(',')).join(' ')+'"/>'+at.map((x,i)=>'<circle cx="'+x[0]+'" cy="'+x[1]+'" r="4" fill="#966f79"><title>'+escape(date(p[i].date))+': '+escape(fmt(p[i].value,1))+' '+escape(unitName)+'</title></circle>').join('')+'<text x="0" y="16" fill="#756f6a" font-size="11">'+escape(fmt(max,1))+'</text></svg>';
  const table='<details><summary>Ver valores</summary><div class="scroll"><table><thead><tr><th>Fecha</th><th>Valor</th></tr></thead><tbody>'+p.map(x=>'<tr><td>'+escape(date(x.date))+'</td><td>'+escape(fmt(x.value,1))+' '+escape(unitName)+'</td></tr>').join('')+'</tbody></table></div></details>';
  return section(title,'<div class="chart-wrap">'+svg+'<div class="chart-labels"><span>'+escape(dayLabel(p[0].date))+'</span><span>'+escape(dayLabel(p.at(-1).date))+'</span></div></div>'+table);
}
function exercisePanel(){
  const s=db.sessions,occurrences=new Map();
  for(const row of s)for(const e of exercises(row)){const key=e.catalog_id||e.id;if(!occurrences.has(key))occurrences.set(key,{name:e.name||e.name_original,dates:new Set()});occurrences.get(key).dates.add(sessionDay(row));}
  const choices=[...occurrences].filter(([,x])=>x.dates.size>=2);
  if(!choices.length)return '';
  const options=choices.map(([id,x])=>'<option value="'+escape(id)+'">'+escape(x.name)+'</option>').join('');
  return section('Evolución por ejercicio','<label class="muted" for="exerciseSelect">Ejercicio</label><select id="exerciseSelect" class="exercise-select">'+options+'</select><div id="exerciseContent"></div>');
}
function renderExercise(){
  const id=$('#exerciseSelect')?.value;if(!id)return;
  const rows=exerciseRows(db.sessions,id);
  const records=personalBests(rows);
  let out='';
  if(records.length>=1&&new Set(rows.map(r=>sessionDay(r.session))).size>=2){
    out+='<h3>Mayor carga registrada</h3>'+records.map(r=>'<p class="muted">'+escape(fmt(r.set.load_kg,1))+' kg · '+escape(basis[r.set.load_basis]||r.set.load_basis)+' · '+escape(date(r.date))+'</p>').join('');
  }
  const bases=[...new Set(rows.filter(r=>number(r.set.load_kg)&&r.set.load_basis&&r.set.load_basis!=='unknown').map(r=>r.set.load_basis))];
  for(const b of bases){
    const byDay=new Map();
    for(const r of rows.filter(r=>r.set.load_basis===b&&number(r.set.load_kg))){const k=sessionDay(r.session),old=byDay.get(k);if(!old||r.set.load_kg>old.value)byDay.set(k,{date:k,value:r.set.load_kg});}
    out+=chart('Carga · '+(basis[b]||b),[...byDay.values()],'kg');
  }
  const bySession=new Map();
  for(const r of rows)if(!bySession.has(r.session.id))bySession.set(r.session.id,{date:sessionDay(r.session),sets:0});
  for(const r of rows)if(number(r.set.set_count))bySession.get(r.session.id).sets+=r.set.set_count;
  out+=chart('Series por sesión',[...bySession.values()].filter(r=>r.sets>0).map(r=>({date:r.date,value:r.sets})),'series');
  $('#exerciseContent').innerHTML=out;
}
function extraTrends(days){
  if(days.length<2)return '';
  let out='';
  out+=chart('FC máxima por día',days.map(d=>({date:d.date,value:d.max_bpm})),'lpm');
  out+=chart('FC media diaria ponderada',days.map(d=>({date:d.date,value:d.average_bpm})),'lpm');
  const rpe=db.sessions.map(s=>({date:sessionDate(s),value:manual(s).rpe}));
  out+=chart('Esfuerzo percibido por sesión',rpe,'/ 10');
  return out;
}
function detailGrid(items){return '<div class="detail-grid">'+items.filter(x=>x[1]!=null&&x[1]!=='').map(x=>'<div><small>'+escape(x[0])+'</small><strong>'+escape(x[1])+'</strong></div>').join('')+'</div>';}
function safePath(path){return typeof path==='string'&&/^evidence\/[a-zA-Z0-9_./-]+$/.test(path)&&!path.includes('..')?path:null;}
function showSession(s){
  const a=auto(s),m=manual(s);
  let html='<h2>'+escape(activityName(s))+'</h2><p class="muted">'+escape(date(sessionDate(s)))+'</p>';
  const ap=[['Duración',duration(a.duration_seconds)],['Calorías de actividad',unit(a.active_calories_kcal,'kcal')],['Calorías totales',unit(a.total_calories_kcal,'kcal')],['FC media',unit(a.heart_rate?.average_bpm,'lpm')],['FC máxima',unit(a.heart_rate?.max_bpm,'lpm')],['Dispositivo',a.device],...(a.extra_metrics||[]).map(x=>[x.label,x.value==null?null:String(x.value)+(x.unit?' '+x.unit:'')])];
  if(ap.some(x=>x[1]!=null))html+='<div class="detail-group"><span class="tag">Mi Fitness · Captura</span>'+detailGrid(ap)+'</div>';
  html+=zonesPanel([s],true)+effectsPanel([s],true);
  if((a.zones||[]).some(z=>number(z.percent)))html+=section('Porcentajes por zona',detailGrid(a.zones.map(z=>[z.name,number(z.percent)?fmt(z.percent,1)+' %':null])));
  if(a.heart_rate?.curve_note)html+='<p class="muted">'+escape(a.heart_rate.curve_note)+'</p>';
  const samples=(a.heart_rate?.samples||[]).filter(x=>number(x.elapsed_seconds)&&number(x.bpm));
  if(samples.length)html+=section('FC registrada',samples.map(x=>'<div class="compare"><span>'+escape(duration(x.elapsed_seconds))+'</span><strong>'+escape(x.bpm)+' lpm</strong></div>').join(''));
  const mp=[['Sensación',m.feeling],['Esfuerzo percibido',unit(m.rpe,'/ 10')],['Sueño',unit(m.context?.sleep_hours,'h')],['Calidad de sueño',m.context?.sleep_quality],['Estrés',m.context?.stress],['Energía',m.context?.energy],['Cansancio',m.context?.fatigue],['Molestias',m.context?.discomfort],['Contexto',m.context?.notes]];
  if(mp.some(x=>x[1]!=null))html+='<div class="detail-group"><span class="tag">Informado por Mica</span>'+detailGrid(mp)+'</div>';
  for(const e of exercises(s)){
    let body='<p class="muted">Nombre original: '+escape(e.name_original)+(e.muscle_groups?.length?' · '+escape(e.muscle_groups.join(', ')):'')+'</p>';
    body+=sets(e).map(t=>'<div class="activity-day"><strong>'+escape(number(t.set_count)?t.set_count+' series':'Serie')+'</strong><small>'+[number(t.reps)?t.reps+' reps':null,number(t.load_kg)?fmt(t.load_kg,1)+' kg'+(t.load_basis?' · '+(basis[t.load_basis]||t.load_basis):''):null,number(t.duration_seconds)?duration(t.duration_seconds):null,number(t.rest_seconds)?'Descanso '+duration(t.rest_seconds):null,t.notes].filter(Boolean).map(escape).join(' · ')+'</small></div>').join('');
    if(e.notes)body+='<p class="muted">'+escape(e.notes)+'</p>';
    html+=section(e.name||e.name_original,body);
  }
  const evidence=(a.evidence||[]).filter(x=>safePath(x.path));
  if(evidence.length)html+=section('Captura',evidence.map(x=>'<img class="evidence" src="'+escape(x.path)+'" alt="'+escape(x.description||'Resumen Mi Fitness')+'">').join(''));
  if(a.visible_text)html+='<details><summary>Texto visible de la captura</summary><p class="context">'+escape(a.visible_text)+'</p></details>';
  if(m.original_text)html+='<details><summary>Comentarios originales</summary><p class="context">'+escape(m.original_text)+'</p></details>';
  if(a.uncertainties?.length)html+='<p class="muted">'+escape(a.uncertainties.join('; '))+'</p>';
  $('#detailBody').innerHTML=html;$('#detail').showModal();
}
function render(){
  if(!db)return;
  const days=dailyTraining(db.sessions);
  if(!db.sessions.length&&!(db.daily_activity||[]).length){$('#content').innerHTML='<section class="section empty"><h2>Tu historia empieza acá</h2><p>Mandá tu primera captura o los pasos del día en este chat.</p></section>';return;}
  let html=mainCards(days)+evolutionPanel()+sessionList(days)+activityComparison()+weeklyPanel(days)+zonesPanel(db.sessions)+effectsPanel(db.sessions)+secondaryCards()+exercisePanel()+extraTrends(days);
  $('#content').innerHTML=html;
  bindEvolution();
  bindEffect();
  document.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>showSession(db.sessions.find(s=>s.id===b.dataset.session)));
  if($('#exerciseSelect')){$('#exerciseSelect').onchange=renderExercise;renderExercise();}
}
$('#how').onclick=()=>$('#guide').showModal();
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#export').disabled=true;
$('#export').onclick=()=>{if(!db)return;const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mica-historial.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
try{const r=await fetch('history.json',{cache:'no-store'});if(!r.ok)throw new Error('http');db=await r.json();if(!Array.isArray(db.sessions)||!Array.isArray(db.daily_activity))throw new Error('schema');$('#status').textContent='';$('#export').disabled=false;render();}catch{$('#status').textContent='No se pudo cargar el historial. Volvé a abrir el tablero para reintentar.';}
