// Buds FE RFCOMM framing and field layout based on GalaxyBudsClient (GPL-3.0).
function crc(data){let c=0;for(const b of data){c^=b<<8;for(let i=0;i<8;i++)c=((c<<1)^((c&0x8000)?0x1021:0))&65535;}return c;}
function packet(id,payload=[]){const body=Buffer.from([id,...payload]),n=body.length+2,c=crc(body);return Buffer.from([0xfd,n&255,n>>8,...body,c&255,c>>8,0xdd]);}
class Decoder {
 constructor(onMessage){this.buffer=Buffer.alloc(0);this.onMessage=onMessage;}
 push(chunk){this.buffer=Buffer.concat([this.buffer,chunk]);while(this.buffer.length){const start=this.buffer.indexOf(0xfd);if(start<0){this.buffer=Buffer.alloc(0);break;}this.buffer=this.buffer.subarray(start);if(this.buffer.length<4)break;const size=this.buffer.readUInt16LE(1)&1023;if(size<3||size>1000){this.buffer=this.buffer.subarray(1);continue;}if(this.buffer.length<size+4)break;const b=this.buffer.subarray(0,size+4),body=b.subarray(3,1+size);if(b[b.length-1]!==0xdd||crc(body)!==b.readUInt16LE(1+size)){this.buffer=this.buffer.subarray(1);continue;}this.buffer=this.buffer.subarray(size+4);this.onMessage(b[3],Buffer.from(b.subarray(4,1+size)));}}
}
function battery(n){return n>=0&&n<=100?n:null;}
function status(id,p){if(id===97&&p.length>=13&&p[1]===6){return {revision:p[0],earType:p[1],left:battery(p[2]),right:battery(p[3]),case:battery(p[7])||null,equalizer:p[9]<=5?p[9]:null,touchLocked:(p[10]&128)===0,touchBits:p[10],noise:p[12]<=2?p[12]:null,placementLeft:p[6]>>4,placementRight:p[6]&15};}if(id===96&&p.length>=7)return {left:battery(p[1]),right:battery(p[2]),case:battery(p[6])||null,placementLeft:p[5]>>4,placementRight:p[5]&15};if(id===119&&p.length&&p[0]<=2)return {noise:p[0]};return null;}
const originalStatus=status;
function extendedStatus(id,p){const s=originalStatus(id,p);if(id===97&&s){s.touchLeft=p[11]>>4;s.touchRight=p[11]&15;if(p.length>31){s.ambientVolume=p[23];s.ambientCustom={enabled:p[29]===1,left:p[30]>>4,right:p[30]&15,tone:p[31]};}s.gameMode=p[8]===1;}return s;}
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
function commandSpec(state,field,value){
 let id,payload,patch;
 if(field==='noise'&&integer(value,0,2)){id=120;payload=[value];patch={noise:value};}
 if(field==='equalizer'&&integer(value,0,5)){id=134;payload=[value];patch={equalizer:value};}
 if(field==='ambientVolume'&&integer(value,0,2)){id=132;payload=[value];patch={ambientVolume:value};}
 if(field==='ambientCustom'&&value&&typeof value.enabled==='boolean'&&integer(value.left,0,2)&&integer(value.right,0,2)&&integer(value.tone,0,4)){id=130;payload=[+value.enabled,value.left,value.right,value.tone];patch={ambientCustom:{...value}};}
 if(field==='touchOptions'&&value&&integer(value.left,1,6)&&integer(value.right,1,6)){id=146;payload=[value.left,value.right];patch={touchLeft:value.left,touchRight:value.right};}
 if(field==='touchLocked'&&typeof value==='boolean'&&integer(state.touchBits,0,255)){id=144;const bits=state.touchBits;payload=[+!value,...[8,4,2,1,16,32].map(b=>+(!!(bits&b)))];patch={touchLocked:value};}
 if(!id)throw new Error('Comando inválido.');
 return {id,payload,patch,matches:s=>Object.entries(patch).every(([k,v])=>JSON.stringify(s[k])===JSON.stringify(v))};
}
module.exports={crc,packet,Decoder,status:extendedStatus,commandSpec};
