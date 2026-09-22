const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {makeDisk}=require('./disk.cjs');
const ROOT=path.resolve(__dirname,'..');
async function replace(file,bytes){const tmp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(tmp,bytes);await fs.rename(tmp,file);}
async function createFromFile(source,name){
 if(typeof source!=='string')throw Error('sourcePath is required');
 const ext=path.extname(source).toLowerCase();if(!['.rom','.mx1','.mx2','.com','.bas'].includes(ext))throw Error('Expected ROM, COM or BAS');
 const id=(path.basename(source,ext).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40)||'project')+'-'+crypto.randomBytes(4).toString('hex');
 const p={version:1,id,name:typeof name==='string'?name.slice(0,120):path.basename(source,ext),kind:ext==='.com'?'dos':ext==='.bas'?'basic':'rom',engine:'webmsx-6.0.8',machine:'MSX1E',labels:[],breakpoints:[],watches:[],resources:[]};
 const dir=path.join(ROOT,'projects',id);for(const d of ['program','research','environment','resources','captures'])await fs.mkdir(path.join(dir,d),{recursive:true});
 try{return await updateBuild(p,source);}catch(e){await fs.rm(dir,{recursive:true,force:true});throw e;}
}
async function updateBuild(project,source){
 if(!/^[a-z0-9_-]+$/.test(project.id)||typeof source!=='string')throw Error('Invalid build request');
 const bytes=await fs.readFile(source);if(!bytes.length||bytes.length>16*1024*1024)throw Error('Build is empty or exceeds 16 MB');
 const dir=path.join(ROOT,'projects',project.id),kind=project.kind,ext=path.extname(source).toLowerCase();
 if(kind==='dos'&&ext!=='.com'||kind==='basic'&&ext!=='.bas'&&project.launch?.mode!=='loader'||kind==='rom'&&!['.rom','.mx1','.mx2'].includes(ext)||!['dos','basic','rom'].includes(kind))throw Error('Build type differs from project');
 const engineSha256=await require('./launch.cjs').validateSelection(project.engine,project.machine);
 const newHash=crypto.createHash('sha256').update(bytes).digest('hex'),oldHash=project.buildSha256||project.romSha256;
 const file=kind==='dos'?(project.launch?.programName||'APP.COM'):kind==='basic'?(project.launch?.loaderName||'APP.BAS'):'APP.ROM';
 if(kind==='dos'&&(!/^[A-Z0-9_]{1,8}\.COM$/.test(file)||file==='COMMAND.COM'))throw Error('Invalid DOS program filename');
 const next={...project,engineSha256,launch:{...project.launch,extras:[...(project.launch?.extras||[])]},buildSha256:newHash,researchForBuild:project.researchForBuild||oldHash||newHash,researchMismatch:!!(project.labels.length&&(project.researchForBuild||oldHash)&&newHash!==(project.researchForBuild||oldHash))};
 let disk;const inventory=[];const resource=require('./launch.cjs').resource;const secondary=project.launch?.secondaryRom?await resource(dir,project.launch.secondaryRom):null;
 if(kind!=='rom') {
  const env=path.join(ROOT,'resources/environments/msxdos1'),files=[];
  if(!next.launch.template)next.launch.template=await require('./launch.cjs').importFile(dir,path.join(env,'template.dsk'));
  if(kind==='dos'&&!next.launch.dos){next.launch.dos={system:await require('./launch.cjs').importFile(dir,path.join(env,'MSXDOS.SYS')),command:await require('./launch.cjs').importFile(dir,path.join(env,'COMMAND.COM'))};next.launch.dosSource='shared-msxdos1';}
  if(kind==='dos'){for(const name of ['MSXDOS.SYS','COMMAND.COM'])files.push({name,content:next.launch?.dos?await resource(dir,next.launch.dos[name==='MSXDOS.SYS'?'system':'command']):await fs.readFile(path.join(env,name))});files.push({name:'AUTOEXEC.BAT',content:Buffer.from((project.launch?.bootCommand||file.slice(0,-4))+'\r\n')});next.environment='msxdos1';}
  files.push({name:file,content:bytes});for(const item of project.launch?.extras||[])files.push({name:item.name,content:await resource(dir,item)});for(const item of files)inventory.push({name:item.name,size:item.content.length,sha256:crypto.createHash('sha256').update(item.content).digest('hex')});disk=makeDisk(await resource(dir,next.launch.template),files);next.disk='environment/boot.dsk';next.basicRun=kind==='basic'?(project.launch?.loaderName||'APP.BAS'):undefined;
 }
 // Publish immutable complete bundles first; only then switch project.json.
 // A failure before that final atomic rename leaves the previous program AND disk selected.
 const builds=path.join(dir,'builds');await fs.mkdir(builds,{recursive:true});
 const bundleHash=crypto.createHash('sha256').update(bytes).update(disk||Buffer.alloc(0)).update(secondary||Buffer.alloc(0)).update(JSON.stringify({engine:project.engine,engineSha256,machine:project.machine,kind,...(project.launch?.vdp?{vdp:project.launch.vdp}:{}),...(project.launch?.dataDisk?{dataDisk:true}:{})})).digest('hex');
 next.launchHash=bundleHash;
 const relative='builds/'+bundleHash,bundle=path.join(dir,relative),stage=path.join(builds,'.stage-'+crypto.randomUUID());
 await fs.mkdir(stage);
 try{
  await fs.writeFile(path.join(stage,file),bytes);if(disk)await fs.writeFile(path.join(stage,'boot.dsk'),disk);if(secondary)await fs.writeFile(path.join(stage,'SECOND.ROM'),secondary);
  await fs.writeFile(path.join(stage,'build.json'),JSON.stringify({version:1,launch:next.launch,files:inventory,secondaryRomSha256:secondary?crypto.createHash('sha256').update(secondary).digest('hex'):null,engineSha256,programSha256:newHash,diskSha256:disk?crypto.createHash('sha256').update(disk).digest('hex'):null,engine:project.engine,machine:project.machine},null,2));
  try{await fs.rename(stage,bundle);}catch(e){if(!['EEXIST','ENOTEMPTY'].includes(e.code))throw e;const present=await fs.readFile(path.join(bundle,file));if(!present.equals(bytes)||disk&&!(await fs.readFile(path.join(bundle,'boot.dsk'))).equals(disk))throw Error('Existing build bundle differs from its content hash');if(secondary&&!(await fs.readFile(path.join(bundle,'SECOND.ROM'))).equals(secondary))throw Error('Second ROM bundle mismatch');}
 }finally{await fs.rm(stage,{recursive:true,force:true});}
 next.secondaryRom=secondary?relative+'/SECOND.ROM':undefined;next.buildFiles=inventory;
 next.program=relative+'/'+file;if(kind==='rom')next.rom=next.program;else next.disk=relative+'/boot.dsk';
 if(oldHash&&oldHash!==newHash){await replace(path.join(builds,oldHash+'.project.json'),JSON.stringify(project,null,2));const oldPath=project.program||project.rom;if(oldPath){const resolved=path.resolve(dir,oldPath);if(!resolved.startsWith(dir+path.sep))throw Error('Invalid program path');await fs.copyFile(resolved,path.join(builds,oldHash+path.extname(oldPath)));}}
 await replace(path.join(dir,'project.json'),JSON.stringify(next,null,2));return next;
}
async function changeType(p,kind,source,options={}){
 if(!['rom','dos','basic','loader'].includes(kind))throw Error('Unsupported project type');
 if(p.kind==='mock'||typeof source!=='string'||!path.isAbsolute(source))throw Error('Choose a program file');
 const loader=kind==='loader',launch={extras:[]};
 const next={...p,kind:loader?'basic':kind,rom:undefined,disk:undefined,basicRun:undefined,secondaryRom:undefined,activeLaunchProfile:undefined,launchProfiles:[],launch};
 if(kind==='dos'){
  next.machine=options.machine||p.machine;
  await require('./launch.cjs').validateSelection(next.engine,next.machine);
  const names=new Set(['APP.COM','AUTOEXEC.BAT','MSXDOS.SYS','COMMAND.COM']);
  const files=options.files||[];if(!Array.isArray(files)||files.length>100)throw Error('Too many files');
  for(const f of files){const name=path.basename(f).toUpperCase();if(!/^[A-Z0-9_]{1,8}(\.[A-Z0-9_]{1,3})?$/.test(name)||names.has(name))throw Error('Повторное или зарезервированное имя: '+name);names.add(name);launch.extras.push({name,...await require('./launch.cjs').importFile(path.join(ROOT,'projects',p.id),f,720*1024)});}
 }
 if(loader){
  const name=path.basename(source).toUpperCase();if(!/^[A-Z0-9_]{1,8}(\.[A-Z0-9_]{1,3})?$/.test(name))throw Error('Имя загрузчика должно иметь формат 8.3');
  const bytes=await fs.readFile(source);if(bytes[0]!==255&&!/^\s*\d+/.test(bytes.toString('ascii')))throw Error('Выберите BASIC-загрузчик');
  launch.mode='loader';launch.loaderName=name;next.machine=options.machine||p.machine;
  await require('./launch.cjs').validateSelection(next.engine,next.machine);
  const files=options.files||[];if(!Array.isArray(files)||files.length>100)throw Error('Too many files');const names=new Set([name]);
  for(const f of files){const filename=path.basename(f).toUpperCase();if(!/^[A-Z0-9_]{1,8}(\.[A-Z0-9_]{1,3})?$/.test(filename)||names.has(filename))throw Error('Повторное или недопустимое имя: '+filename);names.add(filename);launch.extras.push({name:filename,...await require('./launch.cjs').importFile(path.join(ROOT,'projects',p.id),f,720*1024)});}
 }
 return updateBuild(next,source);
}
module.exports={createFromFile,updateBuild,changeType};
