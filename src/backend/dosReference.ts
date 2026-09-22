import documentedFunctions from '../data/dos-functions.json';
// MSX-DOS 2 Function Specification; entries below also exist in DOS 1.
export const dosReferenceSource='https://map.grauw.nl/resources/dos2_functioncalls.php';
export const dosFunctions:Record<number,{name:string;description:string}>={...documentedFunctions,
 0:{name:'_TERM0',description:'Завершение программы'},
 1:{name:'_CONIN',description:'Ввод символа с эхом; результат A'},
 2:{name:'_CONOUT',description:'Вывод символа из E'},
 9:{name:'_STROUT',description:'Вывод строки по DE до символа $'},
 10:{name:'_BUFIN',description:'Ввод строки в буфер по DE'},
 11:{name:'_CONST',description:'Проверка готовности ввода'},
};
