const R=require('../src/referee.js');
const ref=R.create(7);
let st=ref.snapshot();
console.log('start',st.player.x,st.player.z,'cells',ref.map.W,ref.map.H,'torches',ref.map.torches.length);
// walk forward 3s sprinting, then slide
let events=[],out;
for(let i=0;i<180;i++){ out=ref.step(1/60,{mz:1,sprint:true}); events.push(...out.events);}
console.log('after sprint z=',out.state.player.z.toFixed(2),'speed',out.state.player.speed.toFixed(2),'monsters',out.state.monsters.length);
const z0=out.state.player.z;
out=ref.step(1/60,{mz:1,sprint:true,slide:true});
for(let i=0;i<60;i++){ out=ref.step(1/60,{mz:1,sprint:true}); }
console.log('slide dist',(z0-out.state.player.z).toFixed(2));
// aim at nearest monster and shoot until kills
let shotsFired=0;
for(let i=0;i<60*40;i++){
  const s=out.state; const p=s.player;
  let near=null,nd=1e9; for(const m of s.monsters){const d=Math.hypot(m.x-p.x,m.z-p.z); if(d<nd){nd=d;near=m}}
  let lookX=0,lookY=0;
  if(near){ const want=Math.atan2(near.x-p.x,-(near.z-p.z)); let d=want-p.yaw; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
    lookX=d/0.0022; const hd=1.3*near.scale; const wp=Math.atan2(hd-p.eye,nd); lookY=-(wp-p.pitch)/0.0022; }
  out=ref.step(1/60,{lookX,lookY,fire:!!near&&nd<25,mz:0});
  for(const e of out.events){ if(e.type==='shot')shotsFired++; }
}
console.log('kills',out.state.kills,'deaths',out.state.deaths,'shots',shotsFired,'alive',out.state.monsters.length,'hp',out.state.player.hp.toFixed(0));
// ---- reload test ----
{
  const ref=R.create(9); let out; const ev=[];
  for(let i=0;i<5;i++){out=ref.step(1/60,{});}
  // fire 30 rounds
  let t=0; while(out.state.player.ammo>0 && t<200){ out=ref.step(1/60,{fire:true}); ev.push(...out.events); t++; }
  console.log('ammo after mag dump',out.state.player.ammo,'reloading',out.state.player.reloading,'empty',out.state.player.reloadEmpty,'dur',out.state.player.reloadDur.toFixed(2),'events',ev.map(e=>e.type).filter(x=>x!=='shot'&&x!=='hit'&&x!=='kill').join(','));
  // cannot shoot while reloading
  const before=out.state.player.ammo; for(let i=0;i<30;i++){ out=ref.step(1/60,{fire:true}); }
  console.log('mid reload ammo',out.state.player.ammo,'k',out.state.player.reloadK.toFixed(2));
  for(let i=0;i<200;i++){ out=ref.step(1/60,{}); }
  console.log('after reload ammo',out.state.player.ammo,'reloading',out.state.player.reloading);
  // manual reload at 20/30, ADS drops during reload
  for(let i=0;i<10;i++){ out=ref.step(1/60,{fire:true}); }
  out=ref.step(1/60,{reload:true,ads:true}); for(let i=0;i<30;i++) out=ref.step(1/60,{ads:true});
  console.log('manual reload: reloading',out.state.player.reloading,'adsT',out.state.player.adsT.toFixed(2),'empty',out.state.player.reloadEmpty,'dur',out.state.player.reloadDur.toFixed(2));
}
