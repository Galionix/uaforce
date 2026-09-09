/** Local development retains the masters; public builds use content-addressed media. */
declare const __UAFORCE_ASSETS__: Record<string,string>;
export function assetUrl(path:string){
 const assets=typeof __UAFORCE_ASSETS__==='undefined'?{}:__UAFORCE_ASSETS__;
 return assets[decodeURI(path)]??path;
}
