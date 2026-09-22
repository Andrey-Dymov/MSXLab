import {FolderOpen,Tags,ScanSearch,BookOpen,FileCode,History,Monitor,Code, Cpu,Layers,Octagon,Eye,Route,Clapperboard,Map,MemoryStick,Binary,Hash,Type,MessagesSquare,Boxes,Images,Mountain,MapPinned,Ghost,Grid2X2,Grid3X3,CaseSensitive,Palette,Image,Music,Search,Diff,FilePenLine,Tally5,ChartGantt,Network,Link2,ChartLine,type LucideIcon} from 'lucide-react';
import {panelGroups,type PanelId} from '../panels';
const icons:Record<PanelId,LucideIcon>={
 'memory-slots':Layers,'title-screens':Clapperboard,projects:FolderOpen,labels:Tags,patterns:ScanSearch,documentation:BookOpen,listing:FileCode,history:History,
 screen:Monitor,disassembler:Code,registers:Cpu,stack:Layers,breakpoints:Octagon,watches:Eye,trace:Route,session:Clapperboard,
 'memory-map':Map,'vram-map':MemoryStick,memory:Binary,numbers:Hash,text:Type,texts:MessagesSquare,structures:Boxes,
 assets:Images,levels:Mountain,levelmap:MapPinned,sprites:Ghost,tiles:Grid2X2,tilemap:Grid3X3,fonts:CaseSensitive,palette:Palette,bitmap:Image,music:Music,
 search:Search,compare:Diff,writes:FilePenLine,profiler:Tally5,'call-timeline':ChartGantt,'call-map':Network,references:Link2,charts:ChartLine,
};
export function PanelIcon({id}:{id:PanelId}){const Icon=icons[id];return <Icon className="panel-category-icon" data-category={panelGroups.find(group=>group.ids.includes(id))?.ids[0]} size={15} strokeWidth={1.6} aria-hidden="true"/>;}
