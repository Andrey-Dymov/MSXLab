const library=require('../src/data/library.json').entries.filter(e=>e.type==='pattern');
function hydrate(patterns=[]){return patterns.map(p=>{if(!p.libraryId)return p;const source=library.find(x=>x.id===p.libraryId);if(!source)throw Error('Unknown pattern library reference: '+p.libraryId);return {...p,name:p.name??source.name,pattern:p.pattern??source.pattern};});}
function compact(patterns=[]){return hydrate(patterns).map(p=>{const source=library.find(x=>x.pattern===p.pattern&&x.name===p.name);if(!source){const {libraryId,...custom}=p;return custom;}const {name,pattern,...result}=p;return {...result,libraryId:source.id};});}
module.exports={hydrate,compact};
