import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackUrl,reportContext,FEEDBACK_URL} from '../src/game/feedback.ts';

test('reports preserve Ukrainian diagnostic text without inheriting room codes or page query secrets',()=>{
 const context=reportContext({mission:'Дніпро & воля',hero:'Леся Українка',mode:'paused',session:'кооп / guest',controller:'клавіатура'},{agent:'Test browser',width:1920,height:1080});
 const url=new URL(feedbackUrl(context,true));
 assert.equal(url.origin,'https://tally.so');assert.equal(url.pathname,'/embed/b5pMz7');
 assert.equal(new URL(feedbackUrl(context)).pathname,new URL(FEEDBACK_URL).pathname);
 assert.equal(url.searchParams.get('context'),context);assert.equal(url.searchParams.get('hideTitle'),'1');
 assert.deepEqual([...url.searchParams.keys()].sort(),['alignLeft','context','hideTitle','transparentBackground']);
 assert.match(context,/Дніпро & воля/);assert.match(context,/1920×1080/);
 assert.ok(feedbackUrl('x'.repeat(9000)).length<2300);
});
