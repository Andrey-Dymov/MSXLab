export function createActivity(){
 let enabled=true;const sizes={execute:65536,read:65536,write:65536,vramRead:16384,vramWrite:16384};let bins={},touched={};
 function reset(space){for(const [key,size] of Object.entries(sizes)){if(space==='cpu'&&key.startsWith('vram')||space==='vram'&&!key.startsWith('vram'))continue;bins[key]=new Float64Array(size);touched[key]=[];}}
 reset();return {get enabled(){return enabled;},setEnabled(value){enabled=!!value;},reset,add(key,address){if(!enabled||!Number.isInteger(address)||address<0||address>=sizes[key])return;if(!bins[key][address])touched[key].push(address);bins[key][address]=Math.min(Number.MAX_SAFE_INTEGER,bins[key][address]+1);},snapshot(){return {enabled,...Object.fromEntries(Object.keys(sizes).map(key=>[key,Object.fromEntries(touched[key].map(address=>[address,bins[key][address]]))]))};}};
}
