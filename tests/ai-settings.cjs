const assert = require('node:assert/strict'), fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const ai = require('../electron/ai.cjs');
(async () => {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'msxlab-ai-'));
 const safeStorage = { isEncryptionAvailable:()=>true, getSelectedStorageBackend:()=> 'test', encryptString:s=>Buffer.from(s.split('').reverse().join('')), decryptString:b=>b.toString().split('').reverse().join('') };
 const config = {enabled:true,baseUrl:'https://provider.example/v1',models:['test-model']};
 try {
  const fresh = await ai.read(dir);assert.equal(fresh.enabled,false);assert.equal(fresh.baseUrl,'');assert.deepEqual(fresh.models,[]);assert.equal(fresh.hasKey,false);
  const key='fixture-only-not-a-real-key';
  const saved=await ai.save(dir,{...config,apiKey:key},{safeStorage});assert.equal(saved.hasKey,true);assert(!JSON.stringify(saved).includes(key));assert(!('encryptedKey' in saved));
  assert(!(await fs.readFile(path.join(dir,'ai.json'),'utf8')).includes(key));
  assert.equal((await fs.stat(path.join(dir,'ai.json'))).mode&0o777,0o600);
  assert.equal(await ai.readKey(dir,config.baseUrl,{safeStorage,env:{}}),key);
  await ai.save(dir,{...config,apiKey:''},{safeStorage});assert.equal(await ai.readKey(dir,config.baseUrl,{safeStorage,env:{}}),key);
  assert.equal(await ai.readKey(dir,'https://other.example/v1',{safeStorage,env:{}}),'');
  assert.equal((await ai.save(dir,{...config,baseUrl:'https://other.example/v1'},{safeStorage})).hasKey,false);
  const before=await fs.readFile(path.join(dir,'ai.json'),'utf8');
  await assert.rejects(ai.save(dir,{...config,apiKey:key},{safeStorage:{...safeStorage,getSelectedStorageBackend:()=> 'basic_text'}}));
  assert.equal(await fs.readFile(path.join(dir,'ai.json'),'utf8'),before);
  await fs.writeFile(path.join(dir,'ai-secrets.json'),JSON.stringify({WAVESPEED_API_KEY:'legacy-fixture'}));
  assert.equal(await ai.readKey(dir,'https://llm.wavespeed.ai/v1',{env:{}}),'legacy-fixture');
  assert.equal(await ai.readKey(dir,'https://other.example/v1',{env:{}}),'');
  assert.equal(await ai.readKey(dir,'https://other.example/v1',{env:{MSXLAB_AI_API_KEY:'env-fixture',MSXLAB_AI_BASE_URL:'https://other.example/v1/'}}),'env-fixture');
  let calls=0;
  const fetchImpl=async(url,options)=>{calls++;assert.equal(url,config.baseUrl+'/chat/completions');assert.equal(options.headers.Authorization,'Bearer '+key);assert.equal(options.redirect,'error');assert.equal(JSON.parse(options.body).messages[0].content,'LD A,1');return {ok:true,json:async()=>({choices:[{message:{content:'Loads a constant.'}}]})};};
  assert.equal((await ai.chat(config,[{role:'user',content:'LD A,1'}],{apiKey:key,fetchImpl})).text,'Loads a constant.');
  await assert.rejects(ai.chat({...config,enabled:false},[],{apiKey:key,fetchImpl}));assert.equal(calls,1);
  await assert.rejects(ai.save(dir,{...config,baseUrl:'https://user:secret@provider.example'}));
  console.log('PASS AI: blank defaults, key isolation, encrypted storage plumbing, legacy scoping, environment binding, disabled mode and request payload (mock network/storage)');
 } finally {await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
