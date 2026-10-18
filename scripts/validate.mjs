import fs from 'node:fs';
const schema=JSON.parse(fs.readFileSync(new URL('../data/history.schema.json',import.meta.url)));
const db=JSON.parse(fs.readFileSync(process.argv[2]||new URL('../dist/history.json',import.meta.url)));
// This validator implements the exact subset of JSON Schema used by this project.
function validate(v,s,p='$') {
  if(s.$ref)return validate(v,s.$ref.split('/').slice(1).reduce((o,k)=>o[k],schema),p);
  const fail=reason=>{throw new Error(`${p}: ${reason}`);};
  if(s.const!==undefined&&v!==s.const)fail('invalid constant');
  if(s.enum&&!s.enum.includes(v))fail('invalid enum');
  const types=Array.isArray(s.type)?s.type:s.type?[s.type]:[];
  const type=v===null?'null':Array.isArray(v)?'array':typeof v;
  if(types.length&&!types.some(t=>t===type||(t==='integer'&&Number.isInteger(v))))fail(`expected ${types}, got ${type}`);
  if(typeof v==='number'){if(!Number.isFinite(v))fail('not finite');if(s.minimum!==undefined&&v<s.minimum)fail('below minimum');if(s.maximum!==undefined&&v>s.maximum)fail('above maximum');}
  if(typeof v==='string'){if(s.minLength&&v.length<s.minLength)fail('too short');if(s.pattern&&!new RegExp(s.pattern).test(v))fail('invalid pattern');}
  if(Array.isArray(v)&&s.items)v.forEach((item,i)=>validate(item,s.items,p+'['+i+']'));
  if(v!==null&&typeof v==='object'&&!Array.isArray(v)){for(const key of s.required||[])if(!(key in v))fail('missing '+key);for(const [key,sub]of Object.entries(s.properties||{}))if(key in v)validate(v[key],sub,p+'.'+key);}
}
validate(db,schema);
const ids=new Set(),catalog=new Set();
for(const e of db.exercise_catalog){if(catalog.has(e.id))throw new Error('Duplicate catalog ID');catalog.add(e.id);}
for(const s of db.sessions){
  if(ids.has(s.id))throw new Error('Duplicate session ID');ids.add(s.id);
  for(const d of [s.automatic.started_at_local,s.manual.performed_at_local].filter(Boolean)){
    const day=d.slice(0,10);const parsed=new Date(day+'T12:00:00Z');
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==day)throw new Error('Invalid calendar date');
    if(d.length>10&&(Number(d.slice(11,13))>23||Number(d.slice(14,16))>59||Number(d.slice(17,19)||0)>59))throw new Error('Invalid time');
  }
  const eids=new Set();for(const e of s.manual.exercises){if(eids.has(e.id))throw new Error('Duplicate exercise ID in session');eids.add(e.id);if(e.catalog_id&&!catalog.has(e.catalog_id))throw new Error('Unknown catalog reference');}
}
console.log(`Valid history: ${db.sessions.length} sessions, ${catalog.size} catalog entries. Schema subset, dates and references checked.`);
