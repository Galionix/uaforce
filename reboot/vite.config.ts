import {readFileSync} from 'node:fs';
export default ({mode}:{mode:string})=>{
 const release=mode==='release';
 const assets=release?JSON.parse(readFileSync('.release/manifest.json','utf8')):{};
 return {
  publicDir:release?'.release/public':'public',
  define:{__UAFORCE_ASSETS__:JSON.stringify(assets)},
  plugins:release?[{name:'public-game-html',transformIndexHtml(html:string){
   return html.replace(/<a\b[^>]*href="\/assets-review\.html"[^>]*>[^<]*<\/a>/g,'').replace(/src="(\/assets\/[^\"]+)"/g,(_,url)=>`src="${assets[url]??url}"`);
  }}]:[],
  build:{outDir:release?'dist-release':'dist',rolldownOptions:{input:release?{game:'index.html',tiktok:'tiktok.html'}:{game:'index.html',tiktok:'tiktok.html',materials:'assets-review.html'}}}
 };
};
