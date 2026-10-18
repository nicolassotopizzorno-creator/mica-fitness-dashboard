import test from 'node:test';
import assert from 'node:assert/strict';
import {totals,volume,setVolume,personalBests,groupedZones,sessionDate} from '../dist/metrics.js';
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
  const result=groupedZones([session({zones:[{name:'Aeróbica',lower_bpm:120,upper_bpm:140,seconds:10},{name:'Aeróbica',lower_bpm:130,upper_bpm:150,seconds:20}]}),session({zones:[{name:'Aeróbica',lower_bpm:120,upper_bpm:140,seconds:30}]})]);
  assert.equal(result.length,2);assert.equal(result[0].seconds,40);
});
test('Manual dates are fallback only; zero exercises is valid',()=>{
  assert.equal(sessionDate(session({}, {performed_at_local:'2026-01-01'})),'2026-01-01');
  assert.equal(sessionDate(session()),null);assert.equal(totals([session()]).exercises,0);
});
