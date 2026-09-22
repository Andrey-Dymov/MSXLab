import type {Project} from './types';
export interface Checkpoint {version:number;project?:string;engine:string;build?:string;launch?:string|null;createdAt?:string;state:unknown}
export function validateCheckpoint(data:Checkpoint,project:Project){
 if(!data||data.version!==1||!data.state||data.project!==undefined&&data.project!==project.id||data.engine!==project.engine||data.build!==(project.buildSha256||project.romSha256)||(data.launch||null)!==(project.launchHash||null))throw Error('Checkpoint belongs to a different project, program or launch setup');
}
