// Only native UI labels use this helper. Project and API data are never translated.
const languages=['ru','en','ja','pt','nl','es','zh'];
const dictionaries=Object.fromEntries(languages.map(language=>[language,require('../src/i18n/'+language+'.json')]));
exports.translate=(language,key)=>(languages.includes(language)&&Object.hasOwn(dictionaries[language],key)?dictionaries[language][key]:Object.hasOwn(dictionaries.en,key)?dictionaries.en[key]:key);
