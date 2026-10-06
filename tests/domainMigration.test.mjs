import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStoredData } from '../src/domainMigration.ts';

test('domain migration imports missing records without overwriting newer destination edits', () => {
  const old = JSON.stringify([{id:'same',title:'old'}, {id:'old-only',title:'keep'}]);
  const current = JSON.stringify([{id:'same',title:'new'}, {id:'new-only',title:'keep'}]);
  const result = mergeStoredData(current,old);
  assert.deepEqual(JSON.parse(result), [{id:'same',title:'new'}, {id:'old-only',title:'keep'}, {id:'new-only',title:'keep'}]);
  assert.equal(mergeStoredData(result,old),result);
});
test('domain migration handles fresh storage and preserves configured client IDs', () => {
  assert.equal(mergeStoredData(null,'[{"id":"event"}]'),'[{"id":"event"}]');
  assert.equal(mergeStoredData('"new"','"old"'),'"new"');
  assert.equal(mergeStoredData('""','"old"'),'"old"');
});
test('domain migration rejects corrupt source data instead of marking it migrated', () => {
  assert.throws(()=>mergeStoredData('[]','{broken'));
});

test('old-origin bridge responds only to the trusted parent and never sends arbitrary storage keys', async () => {
  const { prepareDomain } = await import('../src/domainMigration.ts');
  const originals = Object.fromEntries(['window','location','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  let listener; const sent=[];
  const parent={postMessage:(...args)=>sent.push(args)};
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{parent,addEventListener:(_,fn)=>{listener=fn;}}});
    Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://productivity.dustland.ai',search:'?storage-transfer=1'}});
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key==='serotonin.events.v1'?'[{"id":"old"}]':null}});
    assert.equal(await prepareDomain(),'handled');
    listener({origin:'https://untrusted.example',source:parent,data:{type:'serotonin-storage-request-v1'}});
    listener({origin:'https://www.dustland.ai',source:{},data:{type:'serotonin-storage-request-v1'}});
    assert.equal(sent.length,0);
    listener({origin:'https://www.dustland.ai',source:parent,data:{type:'serotonin-storage-request-v1'}});
    assert.equal(sent.length,1);
    assert.equal(sent[0][1],'https://www.dustland.ai');
    assert.equal(sent[0][0].data['serotonin.events.v1'],'[{"id":"old"}]');
    assert.equal(Object.keys(sent[0][0].data).length,6);
  } finally {
    for(const [key,descriptor] of Object.entries(originals)) {if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
