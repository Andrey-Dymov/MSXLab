const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function local(dir,relative){if(typeof relative!=='string')throw Error('Invalid resource path');const p=path.resolve(dir,relative);if(!p.startsWith(dir+path.sep))throw Error('Resource must belong to project');return p;}
async function importFile(dir,source,max=16*1024*1024){if(typeof source!=='string'||!path.isAbsolute(source))throw Error('Select an absolute source path');const bytes=await fs.readFile(source);if(!bytes.length||bytes.length>max)throw Error('Resource is empty or too large');const sha256=hash(bytes),relative='resources/launch/'+sha256+'/'+path.basename(source).replace(/[^a-zA-Z0-9._-]/g,'_');await fs.mkdir(path.dirname(local(dir,relative)),{recursive:true});await fs.writeFile(local(dir,relative),bytes);return {path:relative,sha256};}
async function validateSelection(engine,machine){
 if(!['MSX1E','MSX1J','MSX2E','MSX2J'].includes(machine))throw Error('Unsupported MSX model');
 const config=JSON.parse(await fs.readFile(path.join(ROOT,'engines/config.json'),'utf8'));const entry=config.engines.find(e=>e.id===engine&&e.adapter==='webmsx-6.0.8');if(!entry)throw Error('Engine has no verified adapter');
 const source=await fs.readFile(local(path.join(ROOT,'engines'),entry.script));if(entry.sha256&&hash(source)!==entry.sha256)throw Error('Engine files differ from registered checksum');return hash(source);
}
async function configure(project,options){
 if(!/^[a-z0-9_-]+$/.test(project.id))throw Error('Invalid project');if(!options||typeof options!=='object')throw Error('Launch options required');const dir=path.join(ROOT,'projects',project.id);const next={...project,activeLaunchProfile:undefined,launch:{...project.launch,extras:[...(project.launch?.extras||[])]}};
 if(options.name!==undefined){if(typeof options.name!=='string'||!options.name.trim()||options.name.length>120)throw Error('Invalid project name');next.name=options.name.trim();}
 if(options.machine!==undefined){if(!['MSX1E','MSX1J','MSX2E','MSX2J'].includes(options.machine))throw Error('Unsupported MSX model');next.machine=options.machine;}
 if(options.vdp!==undefined){if(!['auto','V9938'].includes(options.vdp))throw Error('Unsupported video processor');if(options.vdp==='auto')delete next.launch.vdp;else next.launch.vdp=options.vdp;}
 if(options.engine!==undefined){const config=JSON.parse(await fs.readFile(path.join(ROOT,'engines/config.json'),'utf8'));if(!config.engines.some(e=>e.id===options.engine&&e.adapter==='webmsx-6.0.8'))throw Error('Engine has no verified adapter');next.engine=options.engine;}
 if(options.removeFiles!==undefined){if(!Array.isArray(options.removeFiles)||options.removeFiles.some(x=>typeof x!=='string'))throw Error('Invalid file removal list');next.launch.extras=next.launch.extras.filter(f=>!options.removeFiles.includes(f.name));}
 if(options.addFiles!==undefined){if(!Array.isArray(options.addFiles)||options.addFiles.length>100)throw Error('Too many files');if(project.kind==='rom'&&options.addFiles.length)throw Error('Extra disk files require a DOS or BASIC project');for(const file of options.addFiles){const name=typeof file.name==='string'?file.name.toUpperCase():'';if(!/^[A-Z0-9_]{1,8}(\.[A-Z0-9_]{1,3})?$/.test(name)||['APP.COM','APP.BAS','AUTOEXEC.BAT','MSXDOS.SYS','COMMAND.COM'].includes(name))throw Error('Invalid or reserved disk filename: '+name);if(next.launch.extras.some(f=>f.name===name))throw Error('Duplicate disk filename: '+name);next.launch.extras.push({name,...await importFile(dir,file.sourcePath,720*1024)});}}
 if(options.dos!==undefined){if(project.kind!=='dos')throw Error('DOS files apply to DOS projects only');if(options.dos===null){delete next.launch.dos;next.launch.dosSource='shared-msxdos1';}else {next.launch.dosSource='custom';next.launch.dos={system:await importFile(dir,options.dos.systemPath,720*1024),command:await importFile(dir,options.dos.commandPath,720*1024)};}}
 if(options.secondaryRom!==undefined){if(options.secondaryRom===null)delete next.launch.secondaryRom;else{if(typeof options.secondaryRom!=='string'||! /\.(rom|mx1|mx2)$/i.test(options.secondaryRom))throw Error('Second cartridge must be a ROM file');next.launch.secondaryRom=await importFile(dir,options.secondaryRom);}}
 if(options.bootCommand!==undefined){if(project.kind!=='dos'||typeof options.bootCommand!=='string'||!/^[\x20-\x7e]{1,120}$/.test(options.bootCommand))throw Error('Boot command must be one ASCII line (1–120 characters)');next.launch.bootCommand=options.bootCommand;}
 await validateSelection(next.engine,next.machine);
 return require('./projects.cjs').updateBuild(next,local(dir,project.program||project.rom));
}
async function resource(dir,item){const bytes=await fs.readFile(local(dir,item.path));if(item.sha256!==hash(bytes))throw Error('Project resource changed: '+item.path);return bytes;}
async function profile(project,action,args={}){
 const dir=path.join(ROOT,'projects',project.id),profiles=project.launchProfiles||[];
 if(action==='apply'){const selected=profiles.find(p=>p.id===args.profileId);if(!selected)throw Error('Profile not found');const fingerprint=await validateSelection(selected.settings.engine,selected.settings.machine);if(selected.settings.engineSha256&&selected.settings.engineSha256!==fingerprint)throw Error('Saved profile engine version changed');return require('./projects.cjs').updateBuild({...project,...selected.settings,activeLaunchProfile:selected.id},local(dir,project.program||project.rom));}
 let next;
 if(action==='save'){
  const name=typeof args.name==='string'?args.name.trim():'';if(!name||name.length>80)throw Error('Profile name required (max 80 characters)');if(profiles.length>=50)throw Error('Maximum 50 profiles');if(profiles.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('Profile name already exists');
  const entry={id:crypto.randomUUID(),name,settings:{engine:project.engine,engineSha256:await validateSelection(project.engine,project.machine),machine:project.machine,launch:project.launch||{extras:[]}}};next={...project,activeLaunchProfile:entry.id,launchProfiles:[...profiles,entry]};
 }else if(action==='delete'){if(!profiles.some(p=>p.id===args.profileId))throw Error('Profile not found');next={...project,activeLaunchProfile:project.activeLaunchProfile===args.profileId?undefined:project.activeLaunchProfile,launchProfiles:profiles.filter(p=>p.id!==args.profileId)};}else throw Error('Unknown profile action');
 const file=path.join(dir,'project.json'),temp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(next,null,2));await fs.rename(temp,file);return next;
}
module.exports={configure,local,resource,importFile,profile,validateSelection};
