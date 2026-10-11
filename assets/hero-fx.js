/* Cena de abertura gerada em código: estrada à noite, faróis passando e, depois, luzes de emergência.
   Sem vídeo nem arquivo externo: carrega na hora e não gasta dados. Respeita "reduzir movimento" e "economia de dados". */
(function(){
const cv=document.querySelector('canvas.fx'); if(!cv) return;
const ctx=cv.getContext('2d'), still=matchMedia('(prefers-reduced-motion: reduce)').matches||(navigator.connection&&navigator.connection.saveData);
let W=0,H=0,dpr=1;
function size(){ const r=cv.parentElement.getBoundingClientRect(); dpr=Math.min(2,devicePixelRatio||1); W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
size(); addEventListener('resize',size);
const cars=Array.from({length:9},(_,i)=>({lane:[-1.5,-.5,.5,1.5][i%4],z:Math.random(),v:.22+Math.random()*.2,tail:i%4<2}));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), ease=x=>x*x*(3-2*x);
function proj(lane,z){ const vx=W*.5, vy=H*.34, s=ease(z); const roadW=W*1.5*s; return {x:vx+lane*roadW/4, y:vy+(H-vy)*1.0*s, s}; }
function frame(t){
  ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#05060a'); g.addColorStop(.38,'#0b0d14'); g.addColorStop(1,'#10131b'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // pista
  const vx=W*.5, vy=H*.34; ctx.fillStyle='#14171f'; ctx.beginPath(); ctx.moveTo(vx-W*.01,vy); ctx.lineTo(vx+W*.01,vy); ctx.lineTo(W*1.1,H); ctx.lineTo(-W*.1,H); ctx.fill();
  // tracejado
  ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=2;
  for(let k=0;k<12;k++){ const z=((k/12)+t*.12)%1; const a=proj(0,z), b=proj(0,Math.min(1,z+.035)); ctx.lineWidth=1+a.s*5; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
  ctx.globalCompositeOperation='lighter';
  // faróis (direita) e lanternas (esquerda)
  const calm=clamp((t-3.2)/1.6,0,1);
  cars.forEach(c=>{ const z=c.tail?(c.z+ (1-0)*0 + t*c.v*.5)%1 : (1-((c.z+t*c.v)%1)); const p=proj(c.lane,clamp(z,0,1)); if(p.s<.01) return;
    const r=2+p.s*34, alpha=(1-calm*.75)*Math.min(1,p.s*3);
    const col=c.tail?'255,60,45':'255,238,200';
    [-1,1].forEach(d=>{ const x=p.x+d*r*1.7, rg=ctx.createRadialGradient(x,p.y,0,x,p.y,r*3.2); rg.addColorStop(0,`rgba(${col},${alpha})`); rg.addColorStop(.25,`rgba(${col},${alpha*.45})`); rg.addColorStop(1,`rgba(${col},0)`); ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(x,p.y,r*3.2,0,7); ctx.fill(); });
  });
  // luzes de emergência: azul e vermelho alternando, depois em pulso lento
  const on=clamp((t-1.8)/.8,0,1); if(on>0){ const f=t<3.4?Math.sin(t*14):Math.sin(t*3.2); const a=(.18+.22*(1-calm*.6))*on;
    [[.12,'255,40,40',f],[.88,'40,110,255',-f]].forEach(([px,col,s])=>{ const k=clamp(.5+.5*s,0,1); const x=W*px,y=H*.55,R=Math.max(W,H)*.6; const rg=ctx.createRadialGradient(x,y,0,x,y,R); rg.addColorStop(0,`rgba(${col},${a*k*1.6})`); rg.addColorStop(.5,`rgba(${col},${a*k*.35})`); rg.addColorStop(1,`rgba(${col},0)`); ctx.fillStyle=rg; ctx.fillRect(0,0,W,H); }); }
  ctx.globalCompositeOperation='source-over';
  // escurece embaixo para o texto ler bem
  const sh=ctx.createLinearGradient(0,H*.2,0,H); sh.addColorStop(0,'rgba(5,6,10,0)'); sh.addColorStop(1,'rgba(5,6,10,.78)'); ctx.fillStyle=sh; ctx.fillRect(0,0,W,H);
}
if(still){ frame(3.0); addEventListener('resize',()=>frame(3.0)); return; }
let t0=performance.now(), vis=true, raf=0, last=0;
new IntersectionObserver(e=>{vis=e[0].isIntersecting; if(vis&&!raf) raf=requestAnimationFrame(loop)}).observe(cv);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&vis&&!raf) raf=requestAnimationFrame(loop) });
function loop(now){ raf=0; if(!vis||document.hidden) return; if(now-last>=33){ last=now; frame((now-t0)/1000); } raf=requestAnimationFrame(loop); }
raf=requestAnimationFrame(loop);
})();
