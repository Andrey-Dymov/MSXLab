import {t,useLanguage} from './i18n';
import {MemorySlotsPanel} from './components/MemorySlotsPanel';
import {TitleScreensPanel} from './components/TitleScreensPanel';
import {CallMapPanel} from './components/CallMapPanel';
import {PanelPopup,togglePanelPopup} from './components/PanelPopup';
import {CallTimelinePanel} from './components/CallTimelinePanel';
import {TextsPanel} from './components/TextsPanel';
import {LevelViewer} from './components/LevelViewer';
import {MusicPanel} from './components/MusicPanel';
import {AssetViewer} from './components/AssetViewer';
import {PanelActions} from './state/panelActions';
import {DocumentationPanel} from './components/DocumentationPanel';
import {PatternsPanel} from './components/PatternsPanel';
import {ListingPanel} from './components/ListingPanel';
import {SessionPanel} from './components/SessionPanel';
import {PanelSettings} from './state/panelSettings';
import {GraphicsViewer} from './components/GraphicsViewer';
import {SearchPanel,ComparePanel,WritesPanel,ProfilerPanel,ReferencesPanel,HistoryPanel,ChartsPanel,StructurePanel} from './components/ResearchPanels';
import {ProjectsPanel,DisassemblerPanel,RegistersPanel,ScreenPanel,LabelsPanel,BreakpointsPanel,StackPanel,WatchesPanel,TracePanel,MemoryPanel} from './components/DebugPanels';
import { MemoryMap } from './MemoryMap';
import type { IDockviewPanelProps } from 'dockview-react';
export const panels = [
  ['projects','Projects'], ['labels','Labels'], ['patterns','Patterns'],
  ['disassembler','Disassembler'], ['trace','Trace'],
  ['memory','Memory · HEX'], ['numbers','Data · Numbers'], ['text','Data · Text'], ['texts','Тексты'], ['bitmap','Data · Bitmap'],
  ['memory-slots','Слоты памяти'], ['title-screens','Заставки'], ['screen','Screen'], ['memory-map','Memory Map'], ['vram-map','VRAM Map'],
  ['levels','Levels · ROM'], ['music','Music · PSG'], ['assets','Assets'], ['sprites','Sprites'], ['tilemap','Tilemap'], ['fonts','Fonts'], ['levelmap','Level Map'], ['tiles','Tiles'], ['palette','Palette'],
  ['documentation','Documentation'], ['listing','Source Listing'], ['session','Session & Replay'], ['search','Search'], ['compare','Memory Changes'], ['writes','Write Watchpoints'], ['profiler','Счётчики команд'], ['call-timeline','Хронология вызовов'], ['call-map','Дерево функций'], ['references','Ссылки на адрес'], ['history','Research History'], ['charts','График памяти'], ['structures','Structures'],
  ['registers','Registers'], ['stack','Stack'], ['breakpoints','Breakpoints'], ['watches','Watches']
] as const;
export type PanelId = typeof panels[number][0];
export const panelGroups: {title:string;ids:PanelId[]}[] = [
 {title:'Проект и справочники',ids:['projects','labels','patterns','documentation','listing','history']},
 {title:'Эмулятор и отладка',ids:['screen','disassembler','registers','stack','breakpoints','watches','trace','session']},
 {title:'Память и данные',ids:['memory-slots','memory-map','vram-map','memory','numbers','text','structures']},
 {title:'Графика, музыка и тексты',ids:['title-screens','assets','levels','levelmap','sprites','tiles','tilemap','fonts','palette','bitmap','music','texts']},
 {title:'Поиск и анализ',ids:['search','compare','writes','profiler','call-timeline','call-map','references','charts']},
];

export function Panel({params,api,containerApi}: IDockviewPanelProps<{kind: PanelId;preferences?:Record<string,unknown>}>) {
 useLanguage();
 const id=params.kind;
 const content = id==='memory-slots'?<MemorySlotsPanel/>:id==='title-screens'?<TitleScreensPanel/>:id==='call-map'?<CallMapPanel/>:id==='call-timeline'?<CallTimelinePanel onExpand={()=>togglePanelPopup(api.id)}/>:id==='texts'?<TextsPanel/>:id==='levels'?<LevelViewer/>:id==='music'?<MusicPanel onExpand={()=>togglePanelPopup(api.id)}/>:id==='assets'?<AssetViewer kind="assets" onExpand={()=>togglePanelPopup(api.id)}/>:id==='documentation'?<DocumentationPanel/>:id==='listing'?<ListingPanel/>:id==='session'?<SessionPanel/>:id==='search'?<SearchPanel/>:id==='compare'?<ComparePanel/>:id==='writes'?<WritesPanel/>:id==='profiler'?<ProfilerPanel/>:id==='references'?<ReferencesPanel/>:id==='history'?<HistoryPanel/>:id==='charts'?<ChartsPanel/>:id==='structures'?<StructurePanel/>:id==='projects'?<ProjectsPanel/>:id==='disassembler'?<DisassemblerPanel/>:id==='registers'?<RegistersPanel/>:id==='screen'?<ScreenPanel/>:id==='labels'?<LabelsPanel/>:id==='patterns'?<PatternsPanel/>:id==='breakpoints'?<BreakpointsPanel/>:id==='stack'?<StackPanel/>:id==='watches'?<WatchesPanel/>:id==='trace'?<TracePanel/>:id==='memory'||id==='numbers'||id==='text'?<MemoryPanel kind={id}/>:id==='bitmap'||id==='sprites'||id==='tilemap'||id==='fonts'||id==='tiles'||id==='palette'||id==='levelmap'?<GraphicsViewer kind={id}/>:id==='memory-map'?<MemoryMap/>:id==='vram-map'?<MemoryPanel kind="memory" initialSpace="vram"/>:null;
 return <PanelActions.Provider value={(kind,preferences)=>{containerApi.addPanel({id:kind+'-'+crypto.randomUUID(),component:'panel',title:t(panels.find(p=>p[0]===kind)![1]),params:{kind,preferences},position:{referencePanel:containerApi.panels.find(p=>p.params?.kind===kind)?.id||api.id,direction:'within'}});}}><PanelSettings values={params.preferences||{}} save={preferences=>api.updateParameters({preferences})}><PanelPopup id={api.id} title={t(panels.find(p=>p[0]===id)?.[1]||id)}><section data-automation-panel={api.id} data-automation-preferences={JSON.stringify(params.preferences||{})} className={`panel-body panel-${id}`} aria-label={t(panels.find(p=>p[0]===id)?.[1]||id)}>{content}</section></PanelPopup></PanelSettings></PanelActions.Provider>;
}
