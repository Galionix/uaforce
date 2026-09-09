/** Owner explicitly requests animated entrances. Accessibility mode is an explicit game option. */
export function reducedPresentation(){try{return localStorage.getItem('uaforce.presentation.motion')==='reduced';}catch{return false;}}
