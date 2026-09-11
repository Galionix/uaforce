// Run with: node --experimental-strip-types tools/audit-localization.mjs
import ts from 'typescript';
import fs from 'node:fs';
import {translate} from '../src/game/i18n.ts';
const files=fs.readdirSync('src/game').filter(x=>x.endsWith('.ts')&&!['en.ts','i18n.ts','localized-dom.ts'].includes(x)).map(x=>'src/game/'+x).concat('src/main.ts');
const missing=new Map();let checked=0;
function inspect(value,file){
 const attributes=Array.from(value.matchAll(/(?:aria-label|aria-description|title|alt|placeholder)=["']([^"']+)["']/g),m=>m[1]);
 for(const text of [...value.replace(/<[^>]*>/g,'\n').split('\n'),...attributes]){
  const source=text.trim();if(!/[а-яіїєґ]/i.test(source)||source==='Українська')continue;
  checked++;const en=translate(source,'en');
  // The external Ukrainian form's field name is intentionally quoted in English instructions.
  if(/[а-яіїєґ]/i.test(en.replace('Скриншоти','')))missing.set(source,{file,english:en});
 }
}
for(const file of files){const tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);function walk(n){if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||[ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail].includes(n.kind))inspect(n.text,file);ts.forEachChild(n,walk);}walk(tree);}
inspect(fs.readFileSync('index.html','utf8'),'index.html');
if(missing.size){console.error([...missing]);process.exitCode=1;}else console.log(`${checked} source text occurrences covered by English localization.`);
