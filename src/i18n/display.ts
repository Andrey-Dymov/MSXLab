import {t} from './index';
import type {MemoryScope} from '../backend/types';
/** Display only: scopeCaption remains stable for IDs, keys and remote responses. */
export function scopeLabel(scope?:MemoryScope){if(!scope)return t('CPU · любой слот');const id=String(scope.primary)+(scope.secondary===null?'':'.'+scope.secondary);return t('Слот')+' '+id+(scope.bank===undefined?'':' · '+t('Банк')+' '+scope.bank);}
