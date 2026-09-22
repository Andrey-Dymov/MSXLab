import {defaultTextProfile,type TextProfile} from './textStrings';
// A publisher is catalogue metadata, never a decoder or an auto-detection rule.
export const textEncodings = {
 ascii:'ASCII','msx-int':'MSX · International','msx-jp':'MSX · Japanese','msx-ru':'MSX · Russian',
 'kings-valley':'Тайлы · A=21, 0=10, пробел=00',custom:'Своя таблица',
};
export const textFormats = {
 terminated:'До байта окончания',fixed:'Фиксированная длина',length8:'Длина перед строкой · 8 бит',length16:'Длина перед строкой · 16 бит LE',
 'kings-valley':'VRAM · адрес + данные · FE/FF',
};
export interface GameTextPreset {id:string;publisher:string;game:string;verified:string;romHashes:string[];settings:TextProfile}
export const gameTextPresets:GameTextPreset[]=[{
 id:'kings-valley',publisher:'Konami',game:'King’s Valley',verified:'Проверено на исходном ROM: 5 надписей. Другие игры автоматически совместимыми не считаются.',
 romHashes:['29d64ae6679838a7b3200b7ae8bf1e05807eda4a9f27bbd1d535205d024abd58'],
 settings:{...defaultTextProfile,encoding:'kings-valley',format:'kings-valley',ending:255,romBase:0x4000,writer:0x4055},
}];
export function detectTextPreset(hash?:string){return hash?gameTextPresets.find(p=>p.romHashes.includes(hash)):undefined;}
export function matchingTextPreset(settings:TextProfile){return gameTextPresets.find(p=>p.settings.encoding===settings.encoding&&p.settings.format===settings.format&&p.settings.writer===settings.writer&&p.settings.romBase===settings.romBase);}
