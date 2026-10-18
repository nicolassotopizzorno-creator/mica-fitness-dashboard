import test from 'node:test';
import assert from 'node:assert/strict';
import {totals,volume,setVolume,personalBests,groupedZones,sessionDate,dailyTraining,evolutionSeries,latestDayComparison,trainingEffectSeries,latestComparable,weeklyActivity} from '../dist/metrics.js';
const session=(automatic={},manual={})=>({automatic,manual});
test('Missing measurements stay null and explicit zero stays zero',()=>{
  assert.equal(totals([session()]).duration.value,null);
  assert.equal(totals([session({active_calories_kcal:0})]).activeCalories.value,0);
  assert.equal(totals([]).maxHR.value,null);
});
test('Calories are not double counted and HR averages declare coverage',()=>{
  const t=totals([session({active_calories_kcal:100,total_calories_kcal:120,heart_rate:{average_bpm:100,max_bpm:150}}),session({active_calories_kcal:200,heart_rate:{average_bpm:140,max_bpm:175}}),session()]);
  assert.deepEqual(t.activeCalories,{value:300,count:2});assert.deepEqual(t.totalCalories,{value:120,count:1});
  assert.deepEqual(t.averageHR,{value:120,count:2});assert.equal(t.maxHR.value,175);
});
test('Volume requires every factor and explicit total external load; partial coverage is disclosed',()=>{
  const full={set_count:3,reps:10,load_kg:20,load_basis:'total_external'};
  assert.equal(setVolume(full),600);assert.equal(setVolume({...full,reps:null}),null);
  assert.equal(setVolume({...full,load_basis:'per_hand'}),null);assert.equal(setVolume({...full,load_basis:null}),null);
  const v=volume([session({}, {exercises:[{sets:[full,{...full,load_kg:null}]}]})]);
  assert.deepEqual(v,{value:600,complete:false,known:1,total:2});
});
test('Best loads remain separated by load basis',()=>{
  const result=personalBests([{set:{load_kg:20,load_basis:'per_hand'}},{set:{load_kg:40,load_basis:'total_external'}},{set:{load_kg:100,load_basis:'unknown'}}]);
  assert.equal(result.length,2);assert.deepEqual(result.map(r=>r.set.load_kg),[20,40]);
});
test('Identically named zones with different boundaries are not merged',()=>{
  const result=groupedZones([session({zones:[{name:'Aeróbica',lower_bpm:120,upper_bpm:140,seconds:10},{name:'Aeróbica',lower_bpm:130,upper_bpm:150,seconds:20}]})]);
  assert.equal(result.length,2);assert.equal(result[0].seconds,10);
});
test('Manual dates are fallback only; zero exercises is valid',()=>{
  assert.equal(sessionDate(session({}, {performed_at_local:'2026-01-01'})),'2026-01-01');
  assert.equal(sessionDate(session()),null);assert.equal(totals([session()]).exercises,0);
});
test('Two separate workouts on one day sum duration and calories, max HR and weighted mean',()=>{
  const a={id:'gym',...session({started_at_local:'2026-10-16T08:00',activity:'Gimnasio',duration_seconds:3600,active_calories_kcal:200,heart_rate:{average_bpm:100,max_bpm:130}})};
  const b={id:'pilates',...session({started_at_local:'2026-10-16T17:00',activity:'Pilates',duration_seconds:3000,active_calories_kcal:120,heart_rate:{average_bpm:120,max_bpm:145}})};
  const result=dailyTraining([a,b]);
  assert.equal(result.length,1);assert.equal(result[0].count,2);
  assert.equal(result[0].duration_seconds,6600);assert.equal(result[0].active_calories_kcal,320);
  assert.equal(result[0].duration_complete,true);assert.equal(result[0].calories_complete,true);
  assert.equal(result[0].max_bpm,145);assert.equal(result[0].average_bpm,(3600*100+3000*120)/6600);
  assert.deepEqual(result[0].sessions.map(s=>s.id),['gym','pilates']);
  assert.equal(dailyTraining([a,{...b,automatic:{...b.automatic,heart_rate:{max_bpm:145}}}])[0].average_bpm,null);
  const partial=dailyTraining([a,{...b,automatic:{...b.automatic,duration_seconds:null,active_calories_kcal:null}}])[0];
  assert.equal(partial.duration_seconds,3600);assert.equal(partial.duration_complete,false);
  assert.equal(partial.active_calories_kcal,200);assert.equal(partial.calories_complete,false);
});
test('Zone times from different sessions require the same known boundaries',()=>{
  const zone={name:'Aeróbico',lower_bpm:120,upper_bpm:140,seconds:20};
  const a=session({zones:[zone]}),b=session({zones:[{...zone,seconds:10}]});
  assert.equal(groupedZones([a,b])[0].seconds,30);
  assert.deepEqual(groupedZones([a,session({zones:[{...zone,lower_bpm:null}]})]),[]);
  assert.deepEqual(groupedZones([a,session({zones:[{...zone,upper_bpm:150}]})]),[]);
});
test('Latest activity compares same type and not Pilates with gym',()=>{
  const rows=[
    session({started_at_local:'2026-10-15T10:00',activity:'Gym'}),
    session({started_at_local:'2026-10-16T10:00',activity:'Pilates'}),
    session({started_at_local:'2026-10-17T10:00',activity:'Gimnasio'})
  ];
  const pair=latestComparable(rows);
  assert.equal(pair.latest.automatic.activity,'Gimnasio');
  assert.equal(pair.previous.automatic.activity,'Gym');
  assert.equal(latestComparable(rows.slice(1)),null);
});
test('Daily steps stay separate from sessions and weekly target counts only days with data',()=>{
  const rows=[
    {date:'2026-10-12',steps:{value:9430,source:'user_reported'},step_goal:{value:8000,source:'user_reported'}},
    {date:'2026-10-13',steps:{value:7000,source:'user_reported'},step_goal:{value:8000,source:'user_reported'}}
  ];
  const weeks=weeklyActivity([],rows);
  assert.equal(weeks.length,1);assert.equal(weeks[0].sessions,0);
  assert.equal(weeks[0].goalsMet,1);assert.equal(weeks[0].goalsKnown,2);
  assert.deepEqual(weeks[0].steps,[9430,7000]);
});
test('Evolution groups same-day sessions and uses only active calories',()=>{
  const rows=[
    session({started_at_local:'2026-10-14T08:00',duration_seconds:1800,active_calories_kcal:100,total_calories_kcal:140}),
    session({started_at_local:'2026-10-14T18:00',duration_seconds:3000,active_calories_kcal:150,total_calories_kcal:200}),
    session({started_at_local:'2026-10-15T08:00',duration_seconds:2400,active_calories_kcal:90,total_calories_kcal:120})
  ];
  const daily=[{date:'2026-10-14',steps:{value:9430}},{date:'2026-10-15',steps:{value:8000}}];
  const trend=evolutionSeries(rows,daily);
  assert.deepEqual(trend.sessions,[{date:'2026-10-14',value:2},{date:'2026-10-15',value:1}]);
  assert.deepEqual(trend.time,[{date:'2026-10-14',value:4800},{date:'2026-10-15',value:2400}]);
  assert.deepEqual(trend.calories,[{date:'2026-10-14',value:250},{date:'2026-10-15',value:90}]);
  assert.deepEqual(trend.steps,[{date:'2026-10-14',value:9430},{date:'2026-10-15',value:8000}]);
  const comparison=latestDayComparison(rows,daily);
  assert.deepEqual(comparison.metrics.sessions,[1,2]);
  assert.deepEqual(comparison.metrics.time,[2400,4800]);
  assert.deepEqual(comparison.metrics.steps,[8000,9430]);
  assert.deepEqual(comparison.metrics.calories,[90,250]);
});
test('Evolution omits incomplete daily totals rather than graphing partial sums',()=>{
  const a=session({started_at_local:'2026-10-14T08:00',duration_seconds:1800,active_calories_kcal:100});
  const b=session({started_at_local:'2026-10-15T08:00',duration_seconds:null,active_calories_kcal:null,total_calories_kcal:500});
  const c=session({started_at_local:'2026-10-15T18:00',duration_seconds:600,active_calories_kcal:40});
  const trend=evolutionSeries([a,b,c]);
  assert.deepEqual(trend.sessions.map(p=>p.value),[1,2]);
  assert.deepEqual(trend.time,[{date:'2026-10-14',value:1800}]);
  assert.deepEqual(trend.calories,[{date:'2026-10-14',value:100}]);
  assert.equal(latestDayComparison([a,b,c]).metrics.time,null);
  assert.equal(latestDayComparison([a,b,c]).metrics.calories,null);
  assert.deepEqual(trend.steps,[]);
});
test('Training effects remain per session and different scores are not combined',()=>{
  const a={id:'gym',...session({started_at_local:'2026-10-15T08:00',activity:'Gym',training_effect:[{key:'vitality',label:'Vitalidad',value:1}]})};
  const b={id:'pilates',...session({started_at_local:'2026-10-15T18:00',activity:'Pilates',training_effect:[{key:'vitality',label:'Vitalidad',value:2},{key:'aerobic',label:'Aeróbico',value:3}]})};
  const groups=trainingEffectSeries([a,b]);
  assert.equal(groups.length,2);
  assert.deepEqual(groups[0].points.map(p=>p.value),[1,2]);
  assert.deepEqual(groups[0].points.map(p=>p.session_id),['gym','pilates']);
  assert.deepEqual(groups[1].points.map(p=>p.value),[3]);
});
