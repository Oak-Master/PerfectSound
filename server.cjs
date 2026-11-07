const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {execFile} = require('node:child_process');
const Bridge=require('./bridge.cjs');
const {randomUUID}=require('node:crypto');
const bridge=new Bridge(),token=randomUUID();
const {Mods}=require('./mods.cjs');
const mods=new Mods(bridge);
const {Devices}=require('./devices.cjs');
const devices=new Devices(bridge,mods.dir);
mods.isBudsActive=()=>devices.selected==='buds-fe';
let discoveryAt=0,discoveryPending=null;
function discover(){if(!devices.list().some(d=>d.id==='buds-fe'))return Promise.resolve();if(discoveryPending)return discoveryPending;if(Date.now()-discoveryAt<30000)return Promise.resolve();discoveryAt=Date.now();discoveryPending=new Promise(resolve=>{
 execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Get-PnpDevice -Class Bluetooth -PresentOnly | Where-Object { $_.FriendlyName -like '*Buds FE*' -and $_.InstanceId -like 'BTHENUM\\DEV_*' } | Select-Object FriendlyName,InstanceId | ConvertTo-Json -Compress"],{windowsHide:true,timeout:10000},(err,out)=>{try{const found=[JSON.parse(out.replace(/^\uFEFF/,''))].flat().find(d=>/DEV_([0-9A-F]{12})/i.test(d.InstanceId));const mac=found?.InstanceId.match(/DEV_([0-9A-F]{12})/i)?.[1];if(mac)bridge.connect(mac);else bridge.state.error='Buds FE não encontrado no Windows.';}catch{bridge.state.error='Não foi possível identificar os Buds FE.';}discoveryPending=null;resolve();});});return discoveryPending;}
function json(res,value,code=200){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
const server = http.createServer((req,res)=>{
 if(req.headers.host!=='127.0.0.1:4783'&&req.headers.host!=='localhost:4783'){res.writeHead(403);return res.end();}
 if(req.url==='/api/library'&&req.method==='GET'){devices.refresh().then(()=>json(res,devices.snapshot()));return;}
 if(req.url.startsWith('/api/library/')&&req.method==='POST'){
  if(req.headers['x-buds-token']!==token||req.headers['content-type']!=='application/json'||(req.headers.origin&&!['http://127.0.0.1:4783','http://localhost:4783'].includes(req.headers.origin)))return json(res,{error:'Requisição não autorizada.'},403);
  let body='';req.on('data',b=>{body+=b;if(body.length>2048)req.destroy();});req.on('end',async()=>{try{const d=JSON.parse(body);if(req.url==='/api/library/select')json(res,devices.select(d.id));else if(req.url==='/api/library/add')json(res,devices.add(d.id));else if(req.url==='/api/library/remove')json(res,devices.remove(d.id));else if(req.url==='/api/library/audio')json(res,await devices.set(d.id,d));else throw Error('Operação desconhecida.');}catch(e){json(res,{error:e.message},409);}});return;
 }
 if(req.url==='/api/mods'&&req.method==='GET')return json(res,mods.snapshot());
 if(req.url==='/equalizer.txt'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="buds-equalizer.txt"'});return res.end(mods.exportEQ());}
 if(req.url.startsWith('/api/mods/')&&req.method==='POST'){
  if(req.headers['x-buds-token']!==token||req.headers['content-type']!=='application/json'||(req.headers.origin&&!['http://127.0.0.1:4783','http://localhost:4783'].includes(req.headers.origin)))return json(res,{error:'Requisição não autorizada.'},403);
  let body='';req.on('data',b=>{body+=b;if(body.length>65536)req.destroy();});req.on('end',async()=>{try{const d=JSON.parse(body);if(req.url==='/api/mods/settings')mods.update(d);else if(req.url==='/api/mods/profile')await mods.applyProfile(d.id);else if(req.url==='/api/mods/gestures')await mods.gestures(d.enabled,d.left,d.right);else if(req.url==='/api/mods/action')await mods.action(d.action);else throw Error('Operação desconhecida.');json(res,mods.snapshot());}catch(e){json(res,{error:e.message},409);}});return;
 }
 if(req.url==='/api/status'&&req.method==='GET'){discover();try{bridge.refresh();}catch{}return json(res,{...bridge.state,ready:bridge.state.ready&&bridge.state.connected});}
 if(req.url==='/api/control'&&req.method==='POST'){
  if(devices.selected!=='buds-fe')return json(res,{error:'Este controle é exclusivo dos Galaxy Buds FE. Selecione o fone para continuar.'},409);
  if(req.headers['x-buds-token']!==token||req.headers['content-type']!=='application/json'||(req.headers.origin&&!['http://127.0.0.1:4783','http://localhost:4783'].includes(req.headers.origin)))return json(res,{error:'Requisição não autorizada.'},403);
  let body='';req.on('data',b=>{body+=b;if(body.length>1024)req.destroy();});req.on('end',async()=>{let command;try{command=JSON.parse(body);}catch{return json(res,{error:'JSON inválido.'},400);}try{const state=await bridge.command(command.field,command.value);json(res,state);}catch(e){json(res,{error:e.message},409);}});return;
 }
 if(req.method !== 'GET'){res.writeHead(405);return res.end();}
 if(['/native.js','/mods-ui.js','/devices-ui.js','/device-manager.js'].includes(req.url)){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(fs.readFileSync(path.join(__dirname,req.url.slice(1))));}
 if(req.url==='/logo.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end(fs.readFileSync(path.join(__dirname,'logo.svg')));}
 if(req.url === '/api/devices'){
  execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Get-PnpDevice -Class AudioEndpoint,Bluetooth -PresentOnly | Select-Object FriendlyName,Class,Status | ConvertTo-Json -Compress"],{windowsHide:true,timeout:20000},(err,out)=>{
   res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
   if(err){res.writeHead(503);return res.end(JSON.stringify({error:'Não foi possível consultar o Windows.'}));}
   try {res.end(JSON.stringify({devices:JSON.parse(out.replace(/^\uFEFF/,'')),updatedAt:new Date().toISOString()}));}catch{res.writeHead(503);res.end(JSON.stringify({error:'Resposta inválida do Windows.'}));}
  });return;
 }
 if(req.url!=='/' && req.url!=='/index.html'){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('<script>','<meta name="buds-token" content="'+token+'"><script src="/native.js" defer></script><script src="/mods-ui.js" defer></script><script src="/devices-ui.js" defer></script><script src="/device-manager.js" defer></script><script>'));
});
devices.on('change',()=>{const enabled=devices.list().some(d=>d.id==='buds-fe');if(!enabled&&!bridge.suspended){bridge.suspended=true;bridge.child?.kill();}else if(enabled&&bridge.suspended){bridge.suspended=false;discoveryAt=0;discover();}});
server.listen(4783,'127.0.0.1',()=>console.log('PerfectSound: http://127.0.0.1:4783'));
discover();
let stopped=false;
function shutdown(){if(stopped)return;stopped=true;mods.close();bridge.close();server.close();}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{shutdown();process.exit(0);});
process.on('exit',shutdown);
module.exports={server,bridge,mods,devices,token,shutdown};
