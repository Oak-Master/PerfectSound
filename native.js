(() => {
 const el=id=>document.getElementById(id);
 const cards=[...document.querySelectorAll('.card')];
 const energy=cards[1],eq=cards[2],noise=cards[4];
 const testDialog=document.createElement('dialog');testDialog.className='test-dialog';testDialog.setAttribute('aria-label','Teste estéreo');
 const closeTest=document.createElement('button');closeTest.className='secondary close-test';closeTest.textContent='Fechar';closeTest.onclick=()=>testDialog.close();
 testDialog.append(closeTest,cards[3]);document.body.append(testDialog);
 const openTest=document.createElement('button');openTest.className='test-shortcut';openTest.textContent='Teste estéreo ↗';openTest.onclick=()=>testDialog.showModal();document.querySelector('footer').append(openTest);
 noise.classList.add('noise-card');
 energy.querySelector('.notice').textContent='Leitura direta via Bluetooth.';
 eq.innerHTML='<div class="row"><h3>Equalizador</h3><span class="muted">NO FONE</span></div><label class="muted" for="equalizer">Preset de áudio</label><select id="equalizer" disabled><option value="0">Normal</option><option value="1">Graves reforçados</option><option value="2">Suave</option><option value="3">Dinâmico</option><option value="4">Nítido</option><option value="5">Agudos reforçados</option></select><p class="muted" id="touchState">Aguardando estado dos controles de toque.</p>';
 noise.querySelector('.pill').textContent='BLUETOOTH';
 const controls=noise.querySelector('.profiles');controls.classList.remove('locked');
 controls.innerHTML='<button data-noise="1" disabled>Cancelamento</button><button data-noise="2" disabled>Ambiente</button><button data-noise="0" disabled>Desligado</button>';
 noise.querySelector('p').outerHTML='<p class="muted" id="nativeStatus" role="status">Conectando ao fone…</p>';
 const style=document.createElement('style');style.textContent='#equalizer{display:block;width:100%;margin-top:9px;background:#25282c;color:#eee;border:1px solid #41474c;border-radius:7px;padding:9px;font:inherit;font-size:12px}#equalizer:focus-visible{outline:2px solid #c0ff71}button[data-noise].selected{border-color:#c0ff71;color:#c0ff71;background:#c0ff710c}#nativeStatus{min-height:30px}.battery b{font-variant-numeric:tabular-nums}.profiles button[data-noise]{flex:1;padding:8px 6px;font-size:10px}.hero p{max-width:none}';document.head.append(style);
 const compactStyle=document.createElement('style');compactStyle.textContent='.noise-card{grid-column:1/-1}.noise-card .profiles{max-width:520px}.noise-card #nativeStatus{min-height:16px}.noise-card details{margin-top:8px}.test-shortcut{border:0;background:none;padding:0;color:#9aa18f;font:inherit;white-space:nowrap}.test-shortcut:hover{color:#c0ff71}.test-dialog{color:#eee;background:#1a1c1f;border:1px solid #41474c;border-radius:14px;padding:14px;width:min(430px,calc(100vw - 32px));max-height:calc(100dvh - 32px)}.test-dialog::backdrop{background:#0009;backdrop-filter:blur(5px)}.test-dialog .card{border:0;padding:12px 4px 4px;min-height:0}.close-test{display:block;margin-left:auto;font-size:11px!important;padding:6px 12px!important}.test-dialog .row{flex-wrap:wrap}.test-dialog .status{min-height:30px}footer{align-items:center;flex-wrap:wrap}';document.head.append(compactStyle);
 let busy=false,current=null,loading=false,message='';
 function render(s){current=s;const fresh=s.connected&&s.ready;
  energy.querySelectorAll('.battery>div').forEach((box,i)=>{const n=s[['left','right','case'][i]];box.querySelector('b').textContent=s.connected&&Number.isInteger(n)?n+'%':'—';box.querySelectorAll('.muted')[1].textContent=s.connected&&Number.isInteger(n)?(fresh?'Atualizado':'Última leitura'):'Sem leitura';});
  energy.querySelector('.notice').textContent=s.connected?'Estojo: leitura disponível quando informado pelo fone.':'Aguardando conexão Bluetooth.';
  el('deviceStatus').textContent=fresh?'Conectado · controle ativo':s.connected?'Conectado · aguardando estado':'Desconectado';el('dot').classList.toggle('ok',fresh);
  document.querySelector('.hero>p').textContent=s.ready?'Galaxy Buds FE · protocolo rev. '+s.revision:'Galaxy Buds FE · Bluetooth';
  document.querySelectorAll('[data-noise]').forEach(b=>{b.disabled=!fresh||busy;b.classList.toggle('selected',s.connected&&Number(b.dataset.noise)===s.noise);b.setAttribute('aria-pressed',String(s.connected&&Number(b.dataset.noise)===s.noise));});
  el('equalizer').disabled=!fresh||busy;if(s.equalizer!=null)el('equalizer').value=s.equalizer;
  el('touchState').textContent=fresh?'Toques: '+(s.touchLocked?'bloqueados':'habilitados')+' · leitura do fone':'Aguardando estado dos controles de toque.';
  el('nativeStatus').textContent=message||(s.error?s.error:fresh?'Alterações aplicadas diretamente ao fone.':'Conectando ao serviço de controle…');
  if(s.updatedAt)el('updated').textContent='Bluetooth · '+new Date(s.updatedAt).toLocaleTimeString('pt-BR');
 }
 async function poll(){if(loading||busy)return;loading=true;try{const r=await fetch('/api/status');if(!r.ok)throw Error();render(await r.json());}catch{render({connected:false,ready:false,error:'Serviço local indisponível.'});}finally{loading=false;}}
 async function command(field,value){busy=true;message='Enviando ao fone…';render(current||{});try{const r=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Buds-Token':document.querySelector('meta[name="buds-token"]').content},body:JSON.stringify({field,value})});const data=await r.json();if(!r.ok)throw Error(data.error||'Falha no comando.');message='Confirmado pelo fone.';busy=false;render(data);}catch(e){message=e.message;busy=false;await poll();}finally{busy=false;}}
 controls.querySelectorAll('button').forEach(b=>b.onclick=()=>command('noise',Number(b.dataset.noise)));
 el('equalizer').onchange=e=>command('equalizer',Number(e.target.value));
 const inventoryRefresh=el('refresh').onclick;el('refresh').onclick=async()=>{message='';await inventoryRefresh();await poll();};
 poll();setInterval(poll,5000);
})();
