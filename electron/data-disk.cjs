// A project-owned, writable B: disk. Boot/build bundles remain immutable.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const queues=new Map();
async function write(dir,sector,bytes){
 if(!Number.isInteger(sector)||sector<0||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length%512||bytes.length>32768||sector*512+bytes.length>737280)throw Error('Invalid data disk write');
 const pending=(queues.get(dir)||Promise.resolve()).catch(()=>{}).then(async()=>{
  const project=JSON.parse(await fs.readFile(path.join(dir,'project.json'),'utf8'));
  if(project.launch?.dataDisk!==true)throw Error('Project has no writable data disk');
  const file=path.join(dir,'data','tables.dsk'),disk=await fs.readFile(file);
  if(disk.length!==737280)throw Error('Invalid data disk size');
  bytes.copy(disk,sector*512);
  const temp=file+'.'+crypto.randomUUID()+'.tmp';
  try{await fs.writeFile(temp,disk);await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}
 });
 queues.set(dir,pending);pending.finally(()=>{if(queues.get(dir)===pending)queues.delete(dir);}).catch(()=>{});return pending;
}
module.exports={write};
