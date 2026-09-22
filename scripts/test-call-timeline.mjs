import assert from 'node:assert/strict';
import {createCallTimeline} from '../public/engine/call-timeline.js';
const r=createCallTimeline();
r.start();r.observe(0x4000,0xf000,0xcd,0,false,0);r.advance();r.observe(0x5000,0xeffe,0xcd,0,false,0);r.advance();r.observe(0x6000,0xeffc,0xc9,0,false,0);r.advance();r.observe(0x5003,0xeffe,0xc9,0,false,0);r.advance();r.observe(0x4003,0xf000,0,0,false,0);r.stop();
let e=r.snapshot().events;assert.equal(e.length,3);assert.equal(e[2].parent,1);assert.equal(e[1].complete,true);assert.equal(e[2].complete,true);assert.equal(e[0].complete,false);assert.ok(e[2].start>=e[1].start&&e[2].end<=e[1].end);
r.start();r.observe(1,100,0xc4,64,false,0);r.advance();r.observe(4,100,0,0,true,0);r.advance();r.observe(56,98,0xed,0,false,0x4d);r.advance();r.observe(4,100,0,0,false,0);r.stop();e=r.snapshot().events;assert.equal(e.length,2);assert.equal(e[1].kind,'interrupt');assert.equal(e[1].complete,true);
for(let condition=0;condition<8;condition++){const flag=[64,64,1,1,4,4,128,128][condition];for(const taken of [true,false]){r.start();const flags=(condition%2===1)===taken?flag:0;r.observe(0,100,0xc4+condition*8,flags,false,0);r.advance();r.observe(taken?20:3,taken?98:100,0,0,false,0);assert.equal(r.snapshot().events.length,taken?2:1);}}
r.start();r.observe(100,200,0xcd,0,false,0,1);r.advance();r.observe(300,198,0xc9,0,false,0);r.advance();r.observe(104,200,0,0,false,0);assert.equal(r.snapshot().events[1].complete,true);
r.start();r.observe(1,100,0xff,0,false,0);r.advance();r.observe(56,98,0xc9,0,false,0);r.advance();r.observe(2,100,0,0,false,0);assert.equal(r.snapshot().events[1].complete,true);
const capped=createCallTimeline(1);capped.start();capped.observe(1,100,0xcd,0,false,0);capped.advance();capped.observe(10,98,0,0,false,0);assert.equal(capped.active,false);assert.equal(capped.snapshot().reason,'limit');
r.reset();assert.equal(r.active,false);assert.equal(r.snapshot().events.length,0);
console.log('Call timeline: nesting, conditional calls, returns, RST, prefixes, interrupts, bounds and reset passed.');
for(const seconds of [.5,1,3,5]){const timed=createCallTimeline();timed.start(seconds);const limit=Math.round(3579545*seconds);for(let i=0;i<limit;i++)timed.advance();assert.equal(timed.active,false);assert.equal(timed.snapshot().cycles,limit);assert.equal(timed.snapshot().reason,'duration');timed.advance();assert.equal(timed.snapshot().cycles,limit);}
assert.throws(()=>r.start(-1));assert.throws(()=>r.start(NaN));console.log('Timed captures: 0.5, 1, 3 and 5 seconds stop at the exact cycle limit.');
