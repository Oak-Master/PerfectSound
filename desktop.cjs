const {app,BrowserWindow,Tray,Menu,nativeImage,Notification,shell,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
app.setAppUserModelId('oak.perfectsound.desktop');
if(process.env.PERFECTSOUND_DATA_DIR){fs.mkdirSync(path.join(process.env.PERFECTSOUND_DATA_DIR,'desktop'),{recursive:true});app.setPath('userData',path.join(process.env.PERFECTSOUND_DATA_DIR,'desktop'));}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 let window,tray,backend,quitting=false;
 const show=()=>{if(!quitting&&window&&!window.isDestroyed()){window.show();window.focus();}};
 const fromArgs=args=>{if(quitting)return;const arg=args.find(s=>/^--noise=[012]$/.test(s));if(arg&&backend)backend.mods.action(({0:'off',1:'anc',2:'ambient'})[arg.at(-1)]).catch(()=>{});show();if(args.includes('--tray-menu')&&tray&&!tray.isDestroyed())tray.popUpContextMenu();};
 const onSecondInstance=(_event,args)=>fromArgs(args);
 app.on('second-instance',onSecondInstance);
 app.whenReady().then(()=>{
  process.env.BUDS_DATA_DIR=process.env.PERFECTSOUND_DATA_DIR||path.join(app.isPackaged?path.dirname(app.getPath('exe')):__dirname,'data');
  fs.mkdirSync(path.join(process.env.BUDS_DATA_DIR,'desktop'),{recursive:true});
  app.setPath('userData',path.join(process.env.BUDS_DATA_DIR,'desktop'));
  backend=require('./server.cjs');
  backend.server.on('error',error=>{dialog.showErrorBox('PerfectSound',error.code==='EADDRINUSE'?'Porta 4783 ocupada. Encerre outra instância ou o programa que utiliza essa porta.':error.message);app.quit();});
  const perform=fn=>{if(quitting)return;return Promise.resolve().then(()=>{if(!quitting)return fn();}).catch(e=>{if(!quitting&&Notification.isSupported())new Notification({title:'PerfectSound',body:e.message}).show();});};
  window=new BrowserWindow({width:1080,height:820,minWidth:700,minHeight:650,show:false,backgroundColor:'#101113',title:'PerfectSound',icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('http://127.0.0.1:4783/'))e.preventDefault();});
  window.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
  window.on('close',e=>{if(!quitting){e.preventDefault();window.hide();}});
  window.once('ready-to-show',show);
  if(backend.server.listening)window.loadURL('http://127.0.0.1:4783/');else backend.server.once('listening',()=>window.loadURL('http://127.0.0.1:4783/'));
  tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'icon.png')));tray.setToolTip('PerfectSound');tray.on('double-click',show);
  const rebuild=()=>{if(quitting||!tray||tray.isDestroyed())return;const s=backend.bridge.state,m=backend.mods,library=backend.devices.snapshot(),selected=library.devices.find(d=>d.id===library.selected)||{id:null,name:'Nenhum dispositivo',endpoints:[]},buds=selected.id==='buds-fe',ep=selected.endpoints.find(e=>e.state===1&&e.isDefault)||selected.endpoints.find(e=>e.state===1);tray.setToolTip('PerfectSound · '+selected.name+(buds?' · E '+(s.left??'—')+'% · D '+(s.right??'—')+'%':ep?' · '+ep.volume+'%':' · não detectada'));tray.setContextMenu(Menu.buildFromTemplate([
   {label:'Abrir PerfectSound',click:show},
   {label:'Dispositivo',submenu:library.devices.map(d=>({label:d.name,type:'radio',checked:d.id===selected.id,click:()=>backend.devices.select(d.id)}))},
   {label:buds?(s.connected?'Bateria: E '+(s.left??'—')+'% / D '+(s.right??'—')+'% / Estojo '+(s.case??'—')+'%':'Fone desconectado'):(ep?'Volume Windows: '+ep.volume+'%':selected.name+' não detectada'),enabled:false},
   {type:'separator'},
   {label:'Cancelamento de ruído',type:'radio',checked:s.noise===1,visible:buds,enabled:!!s.ready,click:()=>perform(()=>m.action('anc'))},
   {label:'Som ambiente',type:'radio',checked:s.noise===2,visible:buds,enabled:!!s.ready,click:()=>perform(()=>m.action('ambient'))},
   {label:'Ruído desligado',type:'radio',checked:s.noise===0,visible:buds,enabled:!!s.ready,click:()=>perform(()=>m.action('off'))},
   {label:'Volume +5%',visible:!buds,enabled:!!ep,click:()=>perform(()=>backend.devices.set(selected.id,{volume:Math.min(100,(ep?.volume??0)+5)}))},
   {label:'Volume −5%',visible:!buds,enabled:!!ep,click:()=>perform(()=>backend.devices.set(selected.id,{volume:Math.max(0,(ep?.volume??0)-5)}))},
   {label:ep?.muted?'Ativar som':'Silenciar',visible:!buds,enabled:!!ep,click:()=>perform(()=>backend.devices.set(selected.id,{muted:!ep?.muted}))},
   {label:'Perfil dos Buds FE',visible:buds,submenu:m.config.profiles.map(p=>({label:p.name,type:'radio',checked:m.activeProfile===p.id,click:()=>perform(()=>m.applyProfile(p.id,'bandeja'))}))},
   {label:'Perfis automáticos',visible:buds,type:'checkbox',checked:m.config.autoProfiles,click:item=>m.update({autoProfiles:item.checked})},
   {label:'Reproduzir / pausar',click:()=>perform(()=>m.action('playPause'))},
   {type:'separator'},
   {label:'Abrir pasta de dados',click:()=>shell.openPath(process.env.BUDS_DATA_DIR)},
   {label:'Sair',click:()=>{quitting=true;app.quit();}}
  ]));};
  rebuild();backend.mods.on('change',rebuild);backend.bridge.on('state',rebuild);backend.devices.on('change',rebuild);backend.devices.refresh();
  const notify=body=>{if(!quitting&&Notification.isSupported())new Notification({title:'PerfectSound',body}).show();};
  backend.mods.on('notification',notify);
  app.setUserTasks([{program:app.getPath('exe'),arguments:'',title:'Abrir PerfectSound',description:'Abrir o painel dos seus fones'},{program:app.getPath('exe'),arguments:'--tray-menu',title:'Controles rápidos',description:'Abrir os controles da bandeja'},...[[1,'Ativar ANC'],[2,'Som ambiente'],[0,'Desligar ruído']].map(([mode,title])=>({program:app.getPath('exe'),arguments:'--noise='+mode,title,description:title+' nos Buds FE'}))]);
  let cleanedUp=false;
  app.on('before-quit',()=>{if(cleanedUp)return;cleanedUp=true;quitting=true;backend.mods.off('change',rebuild);backend.bridge.off('state',rebuild);backend.devices.off('change',rebuild);backend.mods.off('notification',notify);app.off('second-instance',onSecondInstance);backend.shutdown();if(tray&&!tray.isDestroyed())tray.destroy();tray=null;});
  if(process.argv.includes('--shutdown-smoke-test')){
   app.once('will-quit',()=>fs.writeFileSync(path.join(process.env.BUDS_DATA_DIR,'shutdown-check.json'),JSON.stringify({completed:true,version:app.getVersion(),at:new Date().toISOString()})));
   setTimeout(()=>app.quit(),1500);
  }
 });
 app.on('window-all-closed',()=>{});
}
