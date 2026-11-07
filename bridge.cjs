const {spawn}=require('node:child_process');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const {packet,Decoder,status,commandSpec}=require('./protocol.cjs');
class Bridge extends EventEmitter {
 constructor(){super();this.state={connected:false,ready:false,error:null};this.pending=null;this.child=null;this.lastAttempt=0;}
 connect(mac){if(this.suspended||this.closed||this.child||Date.now()-this.lastAttempt<10000)return;this.mac=mac;this.lastAttempt=Date.now();this.state={connected:false,ready:false,error:null};
  const script=path.join(__dirname,'bluetooth.ps1').replace(/'/g,"''");
  const child=this.child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`& ([scriptblock]::Create([IO.File]::ReadAllText('${script}'))) -Address '${mac}'`],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const decoder=new Decoder((id,p)=>this.handleMessage(id,p));
  let lines='';child.stdout.on('data',b=>{lines+=b.toString();let i;while((i=lines.indexOf('\n'))>=0){const line=lines.slice(0,i);lines=lines.slice(i+1);try{const msg=JSON.parse(line);if(msg.type==='connected'){this.state.connected=true;this.send(97);}else if(msg.type==='data')decoder.push(Buffer.from(msg.hex.replaceAll('-',''),'hex'));else if(msg.type==='error')this.state.error='Não foi possível conectar aos Buds. Ligue o fone e atualize.';}catch(e){this.state.error='Resposta Bluetooth inválida.';}}});
  child.stderr.on('data',()=>{this.state.error='Falha no auxiliar Bluetooth.';});child.on('error',e=>{this.state.error=e.message;});child.on('close',()=>{if(this.child===child){this.child=null;this.state.connected=false;this.state.ready=false;this.finish(new Error('Conexão Bluetooth encerrada.'));}});
  const watchdog=setTimeout(()=>{if(!this.state.ready&&this.child===child){this.state.error='O fone não enviou estado compatível. Tente reconectar.';child.kill();}},15000);watchdog.unref();
 }
 handleMessage(id,p){const update=status(id,p);if(update){Object.assign(this.state,update,{updatedAt:new Date().toISOString()});if(id===97)this.state.ready=true;}if(this.pending&&id===66&&p.length>=2&&p[0]===this.pending.id){const expected=Buffer.from(this.pending.payload);if(this.pending.id!==144&&p.length>=1+expected.length&&p.subarray(1,1+expected.length).equals(expected)){Object.assign(this.state,this.pending.patch,{updatedAt:new Date().toISOString()});this.finish(null);}else{this.refresh();}}if(this.pending&&update&&this.pending.matches(update))this.finish(null);if(update)this.emit('state',this.state);this.emit('message',id,p);}
 send(id,payload=[]){if(!this.child||!this.state.connected)throw new Error('Fone desconectado.');this.child.stdin.write(JSON.stringify({hex:packet(id,payload).toString('hex').match(/../g).join('-')})+'\n');}
 finish(error){if(!this.pending)return;const p=this.pending;this.pending=null;clearTimeout(p.timer);error?p.reject(error):p.resolve({...this.state});}
 command(field,value){if(this.closed)return Promise.reject(new Error('Aplicativo encerrando.'));if(!this.state.connected||!this.state.ready)return Promise.reject(new Error('Atualize o estado do fone antes de alterar.'));if(this.pending||this.verifying)return Promise.reject(new Error('Aguarde o comando anterior.'));let spec;try{spec=commandSpec(this.state,field,value);}catch(e){return Promise.reject(e);}
  return new Promise((resolve,reject)=>{this.pending={...spec,resolve,reject,timer:setTimeout(()=>{if(spec.id===130)this.verifyReconnect();else this.finish(new Error('Sem confirmação do fone. Atualize o estado antes de tentar novamente.'));},spec.id===130?1800:6000)};try{this.send(spec.id,spec.payload);setTimeout(()=>{if(this.pending)this.refresh();},1000).unref();}catch(e){this.finish(e);}});
 }
 verifyReconnect(){const pending=this.pending;if(!pending)return;this.pending=null;clearTimeout(pending.timer);this.verifying=true;const mac=this.mac;let done=false;const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);this.removeListener('state',onState);this.verifying=false;this.cancelVerification=null;error?pending.reject(error):pending.resolve({...this.state});};const onState=s=>{if(!s.ready)return;finish(pending.matches(s)?null:new Error('A leitura do fone não confirmou o ajuste solicitado.'));};const timer=setTimeout(()=>finish(new Error('Não foi possível reconectar para confirmar o ajuste.')),10000);this.cancelVerification=finish;this.on('state',onState);const child=this.child;if(!child)return finish(new Error('Fone desconectado.'));child.once('close',()=>{this.lastAttempt=0;this.connect(mac);});child.kill();}
 refresh(){if(this.state.connected)this.send(97);}
 close(){if(this.closed)return;this.closed=true;this.cancelVerification?.(new Error('Aplicativo encerrando.'));this.finish(new Error('Aplicativo encerrando.'));this.child?.kill();}
}
module.exports=Bridge;
