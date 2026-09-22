export type BcdFormat='bcd8'|'bcd16le'|'bcd16be'|'bcd32le'|'bcd32be';
export type NumberFormat='u8'|'s8'|'u16le'|'s16le'|'u16be'|'s16be'|'u32le'|'s32le'|'f32le';
export function numberSize(format:NumberFormat|BcdFormat){return format.includes('32')?4:format.includes('16')?2:1;}
export function readNumber(bytes:number[],address:number,format:NumberFormat|BcdFormat){const size=numberSize(format);if(address<0||address+size>bytes.length)return null;if(format.startsWith('bcd')){let digits=bytes.slice(address,address+size);if(format.endsWith('le'))digits.reverse();let result=0;for(const byte of digits){const hi=byte>>4,lo=byte&15;if(hi>9||lo>9)return NaN;result=result*100+hi*10+lo;}return result;}const v=new DataView(Uint8Array.from(bytes.slice(address,address+size)).buffer);switch(format){case'u8':return v.getUint8(0);case's8':return v.getInt8(0);case'u16le':return v.getUint16(0,true);case's16le':return v.getInt16(0,true);case'u16be':return v.getUint16(0,false);case's16be':return v.getInt16(0,false);case'u32le':return v.getUint32(0,true);case's32le':return v.getInt32(0,true);case'f32le':return v.getFloat32(0,true);}}

/** Examples show source bytes in hexadecimal, in increasing address order. */
export const numberFormatLabels:Record<string,string>={
 hex:'HEX · 1 байт — FF',
 hex16le:'HEX · 2 байта, младший первым — 34 12 → 1234',
 hex16be:'HEX · 2 байта, старший первым — 12 34 → 1234',
 u8:'Десятичное · 1 байт, без знака — FF → 255',
 s8:'Десятичное · 1 байт, со знаком — FF → −1',
 u16le:'Десятичное · 2 байта, младший первым — 00 01 → 256',
 s16le:'Со знаком · 2 байта, младший первым — FE FF → −2',
 u16be:'Десятичное · 2 байта, старший первым — 01 00 → 256',
 s16be:'Со знаком · 2 байта, старший первым — FF FE → −2',
 u32le:'Десятичное · 4 байта, младший первым — 00 00 01 00 → 65536',
 s32le:'Со знаком · 4 байта, младший первым — FE FF FF FF → −2',
 f32le:'Дробное · 4 байта, младший первым — 00 00 C0 3F → 1.5',
 bcd8:'BCD · 1 байт — 42 → 42',
 bcd16le:'BCD · 2 байта, младший первым — 34 12 → 1234',
 bcd16be:'BCD · 2 байта, старший первым — 12 34 → 1234',
 bcd32le:'BCD · 4 байта, младший первым — 78 56 34 12 → 12345678',
 bcd32be:'BCD · 4 байта, старший первым — 12 34 56 78 → 12345678',
};
