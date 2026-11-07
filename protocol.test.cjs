const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Decoder,packet,status}=require('./protocol.cjs');
// GalaxyBudsClient BudsFe_rev2.bin, GPL-3.0 reference capture.
const fixture=Buffer.from('fd31106102063a590100110000008f3300004a014a01030004650001001000000101110300000000e80300009d0e1d005000c2cfdd','hex');
test('decode real Buds FE capture across arbitrary transport boundaries',()=>{let result;const d=new Decoder((id,p)=>result=status(id,p));for(const byte of fixture)d.push(Buffer.from([byte]));assert.equal(result.left,58);assert.equal(result.right,89);assert.equal(result.noise,0);assert.equal(result.equalizer,0);assert.equal(result.touchLocked,false);assert.equal(result.case,null);});
test('reject corrupt CRC and recover following valid packet',()=>{const bad=Buffer.from(fixture);bad[9]^=1;const messages=[];const d=new Decoder((id,p)=>messages.push(status(id,p)));d.push(Buffer.concat([bad,fixture]));assert.equal(messages.length,1);});
test('recover garbage and handle coalesced frames',()=>{const messages=[];new Decoder((id,p)=>messages.push([id,...p])).push(Buffer.concat([Buffer.from([0,1,2]),packet(120,[1]),packet(134,[3])]));assert.deepEqual(messages,[[120,1],[134,3]]);});
test('reject wrong ear type and incomplete extended status',()=>{assert.equal(status(97,Buffer.alloc(13)),null);assert.equal(status(97,Buffer.from([3,6])),null);});
