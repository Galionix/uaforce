/** Enable only after the owner's recipient and a working checkout are verified.
 * No card details, API keys or customer information belong in this static build. */
export const SUPPORT_URL:string|null='https://send.monobank.ua/jar/3Tti3KFKj1';
export function supportUrl(value:string|null){if(!value)return null;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
