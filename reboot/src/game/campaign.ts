/** Stable catalog IDs preserve records and old saves; campaign order is deliberately separate. */
export const CAMPAIGN_ROUTE=[0,1,6,5,9,10,11] as const;
export const SIDE_OPERATIONS=[2,3,4,7,8] as const;
export const FINAL_MISSION=11;
export function nextCampaignMission(mission:number):number|null{const index=CAMPAIGN_ROUTE.indexOf(mission as typeof CAMPAIGN_ROUTE[number]);return index<0||index===CAMPAIGN_ROUTE.length-1?null:CAMPAIGN_ROUTE[index+1];}
export function campaignChapter(mission:number){return CAMPAIGN_ROUTE.indexOf(mission as typeof CAMPAIGN_ROUTE[number])+1;}
