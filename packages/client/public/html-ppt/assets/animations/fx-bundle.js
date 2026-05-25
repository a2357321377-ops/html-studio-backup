/* html-ppt fx :: shared helpers */
(function(){
  window.HPX = window.HPX || {};
  const U = window.HPX._u = {};

  U.css = (el, name, fb) => {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fb;
  };

  U.accent = (el, fb) => U.css(el, '--accent', fb || '#7c5cff');
  U.accent2 = (el, fb) => U.css(el, '--accent-2', fb || '#22d3ee');
  U.text = (el, fb) => U.css(el, '--text-1', fb || '#eaeaf2');

  U.palette = (el) => [
    U.accent(el, '#7c5cff'),
    U.accent2(el, '#22d3ee'),
    U.css(el, '--ok', '#22c55e'),
    U.css(el, '--warn', '#f59e0b'),
    U.css(el, '--danger', '#ef4444'),
  ];

  U.canvas = (el) => {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
    el.appendChild(c);
    const ctx = c.getContext('2d');
    let w = 0, h = 0, dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
    const fit = () => {
      const r = el.getBoundingClientRect();
      w = Math.max(1, r.width|0);
      h = Math.max(1, r.height|0);
      c.width = (w*dpr)|0;
      c.height = (h*dpr)|0;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return {
      c, ctx,
      get w(){return w;}, get h(){return h;}, get dpr(){return dpr;},
      destroy(){
        try{ro.disconnect();}catch(e){}
        if (c.parentNode) c.parentNode.removeChild(c);
      }
    };
  };

  U.loop = (fn) => {
    let raf = 0, stopped = false, t0 = performance.now();
    const tick = (t) => {
      if (stopped) return;
      fn((t - t0)/1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  };

  U.rand = (a,b) => a + Math.random()*(b-a);
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['particle-burst'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    let parts = [];
    const spawn = () => {
      const cx = k.w/2, cy = k.h/2;
      const n = 90;
      for (let i=0;i<n;i++){
        const a = Math.random()*Math.PI*2;
        const s = U.rand(80, 260);
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a)*s, vy: Math.sin(a)*s,
          life: 1, r: U.rand(2,5),
          c: pal[(Math.random()*pal.length)|0]
        });
      }
    };
    spawn();
    let lastSpawn = 0;
    const stop = U.loop((t) => {
      ctx.clearRect(0,0,k.w,k.h);
      if (t - lastSpawn > 2.5) { spawn(); lastSpawn = t; }
      const dt = 1/60;
      parts = parts.filter(p => p.life > 0);
      for (const p of parts){
        p.vy += 220*dt;
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx*dt; p.y += p.vy*dt;
        p.life -= 0.012;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['confetti-cannon'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    let parts = [];
    const fire = () => {
      for (let side=0; side<2; side++){
        const x0 = side===0 ? 20 : k.w-20;
        const y0 = k.h - 20;
        for (let i=0;i<40;i++){
          const a = side===0 ? U.rand(-Math.PI*0.7, -Math.PI*0.4) : U.rand(-Math.PI*0.6, -Math.PI*0.3) - Math.PI/2 - Math.PI/6;
          const spd = U.rand(300, 520);
          parts.push({
            x: x0, y: y0,
            vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
            w: U.rand(6,12), h: U.rand(3,7),
            rot: Math.random()*Math.PI, vr: U.rand(-6,6),
            c: pal[(Math.random()*pal.length)|0],
            life: 1
          });
        }
      }
    };
    fire();
    let last = 0;
    const stop = U.loop((t) => {
      ctx.clearRect(0,0,k.w,k.h);
      if (t - last > 3) { fire(); last = t; }
      const dt = 1/60;
      parts = parts.filter(p => p.life > 0 && p.y < k.h+40);
      for (const p of parts){
        p.vy += 520*dt;
        p.x += p.vx*dt; p.y += p.vy*dt;
        p.rot += p.vr*dt;
        p.life -= 0.006;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['firework'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    let rockets = [], sparks = [];
    const launch = () => {
      rockets.push({
        x: U.rand(k.w*0.2, k.w*0.8), y: k.h+10,
        vx: U.rand(-30,30), vy: U.rand(-520,-380),
        tgtY: U.rand(k.h*0.15, k.h*0.45),
        c: pal[(Math.random()*pal.length)|0]
      });
    };
    const burst = (x, y, c) => {
      const n = 70;
      for (let i=0;i<n;i++){
        const a = Math.random()*Math.PI*2;
        const s = U.rand(60, 240);
        sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,c});
      }
    };
    let last = -1;
    const stop = U.loop((t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0,0,k.w,k.h);
      if (t - last > 0.7) { launch(); last = t; }
      const dt = 1/60;
      rockets = rockets.filter(r => {
        r.x += r.vx*dt; r.y += r.vy*dt; r.vy += 260*dt;
        ctx.fillStyle = r.c;
        ctx.beginPath(); ctx.arc(r.x, r.y, 2.5, 0, Math.PI*2); ctx.fill();
        if (r.y <= r.tgtY || r.vy >= 0) { burst(r.x, r.y, r.c); return false; }
        return true;
      });
      sparks = sparks.filter(p => p.life > 0);
      for (const p of sparks){
        p.vy += 90*dt;
        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx*dt; p.y += p.vy*dt;
        p.life -= 0.012;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['starfield'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const tx = U.text(el, '#ffffff');
    const N = 260;
    const stars = Array.from({length:N}, () => ({
      x: U.rand(-1,1), y: U.rand(-1,1), z: Math.random()
    }));
    const stop = U.loop(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0,0,k.w,k.h);
      const cx = k.w/2, cy = k.h/2;
      for (const s of stars){
        s.z -= 0.006;
        if (s.z <= 0.02) { s.x = U.rand(-1,1); s.y = U.rand(-1,1); s.z = 1; }
        const px = cx + (s.x/s.z)*cx;
        const py = cy + (s.y/s.z)*cy;
        if (px<0||py<0||px>k.w||py>k.h) continue;
        const r = (1-s.z)*2.4;
        ctx.globalAlpha = 1-s.z;
        ctx.fillStyle = tx;
        ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['matrix-rain'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF'.split('');
    const fs = 16;
    let cols = 0, drops = [];
    const init = () => {
      cols = Math.ceil(k.w/fs);
      drops = Array.from({length:cols}, () => U.rand(-20, 0));
    };
    init();
    let lw = k.w, lh = k.h;
    const stop = U.loop(() => {
      if (k.w!==lw || k.h!==lh){ init(); lw=k.w; lh=k.h; }
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0,0,k.w,k.h);
      ctx.font = fs+'px monospace';
      for (let i=0;i<cols;i++){
        const ch = glyphs[(Math.random()*glyphs.length)|0];
        const x = i*fs, y = drops[i]*fs;
        ctx.fillStyle = '#9fffc9';
        ctx.fillText(ch, x, y);
        ctx.fillStyle = '#00ff6a';
        ctx.fillText(ch, x, y - fs);
        drops[i] += 1;
        if (y > k.h && Math.random() > 0.975) drops[i] = 0;
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['knowledge-graph'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    const tx = U.text(el, '#e7e7ef');
    const labels = ['AI','ML','LLM','Graph','Node','Edge','Claude','GPT','RAG','Vector',
      'Embed','Neural','Agent','Tool','Memory','Logic','Data','Train','Infer','Token',
      'Prompt','Chain','Plan','Skill','Cloud','Edge','GPU','Code','Task','Flow'];
    const N = 28;
    const nodes = Array.from({length:N}, (_,i) => ({
      x: U.rand(40, 300), y: U.rand(40, 200),
      vx: 0, vy: 0, label: labels[i%labels.length],
      c: pal[i%pal.length]
    }));
    const edges = [];
    const made = new Set();
    while (edges.length < 50){
      const a = (Math.random()*N)|0, b = (Math.random()*N)|0;
      if (a===b) continue;
      const key = a<b ? a+'-'+b : b+'-'+a;
      if (made.has(key)) continue;
      made.add(key); edges.push([a,b]);
    }
    const stop = U.loop(() => {
      // physics
      for (let i=0;i<N;i++){
        for (let j=i+1;j<N;j++){
          const a=nodes[i], b=nodes[j];
          const dx=b.x-a.x, dy=b.y-a.y;
          let d2=dx*dx+dy*dy; if (d2<1) d2=1;
          const d=Math.sqrt(d2);
          const f=1600/d2;
          const fx=(dx/d)*f, fy=(dy/d)*f;
          a.vx-=fx; a.vy-=fy; b.vx+=fx; b.vy+=fy;
        }
      }
      for (const [i,j] of edges){
        const a=nodes[i], b=nodes[j];
        const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1;
        const f=(d-90)*0.008;
        const fx=(dx/d)*f, fy=(dy/d)*f;
        a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
      }
      const cx=k.w/2, cy=k.h/2;
      for (const n of nodes){
        n.vx += (cx-n.x)*0.002;
        n.vy += (cy-n.y)*0.002;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
      }
      ctx.clearRect(0,0,k.w,k.h);
      ctx.strokeStyle = 'rgba(180,180,220,0.25)'; ctx.lineWidth=1;
      for (const [i,j] of edges){
        const a=nodes[i], b=nodes[j];
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
      ctx.font='11px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      for (const n of nodes){
        ctx.fillStyle = n.c;
        ctx.beginPath(); ctx.arc(n.x,n.y,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = tx;
        ctx.fillText(n.label, n.x, n.y-14);
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['neural-net'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const ac = U.accent(el,'#7c5cff'), ac2 = U.accent2(el,'#22d3ee');
    const layers = [4,6,6,3];
    let nodes = [], edges = [], pulses = [];
    const layout = () => {
      nodes = [];
      const pad = 40;
      const cw = k.w - pad*2, ch = k.h - pad*2;
      for (let L=0; L<layers.length; L++){
        const x = pad + (cw * L / (layers.length-1));
        const n = layers[L];
        for (let i=0;i<n;i++){
          const y = pad + (ch * (i+0.5) / n);
          nodes.push({x,y,L,i});
        }
      }
      edges = [];
      for (let L=0; L<layers.length-1; L++){
        const a = nodes.filter(n=>n.L===L), b = nodes.filter(n=>n.L===L+1);
        for (const x of a) for (const y of b) edges.push([nodes.indexOf(x),nodes.indexOf(y)]);
      }
    };
    layout();
    let lw=k.w, lh=k.h, last=0;
    const stop = U.loop((t) => {
      if (k.w!==lw||k.h!==lh){ layout(); lw=k.w; lh=k.h; }
      ctx.clearRect(0,0,k.w,k.h);
      ctx.strokeStyle = 'rgba(160,160,200,0.22)'; ctx.lineWidth=1;
      for (const [i,j] of edges){
        const a=nodes[i], b=nodes[j];
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
      if (t - last > 0.25){
        last = t;
        const starts = nodes.filter(n=>n.L===0);
        const s = starts[(Math.random()*starts.length)|0];
        pulses.push({node:s, L:0, t:0});
      }
      pulses = pulses.filter(p => p.L < layers.length-1);
      for (const p of pulses){
        p.t += 0.03;
        if (p.t >= 1){
          const next = nodes.filter(n=>n.L===p.L+1);
          p.node2 = next[(Math.random()*next.length)|0];
          if (!p._started){ p._started = true; }
        }
      }
      // animate progression
      for (const p of pulses){
        if (!p.target){
          const next = nodes.filter(n=>n.L===p.L+1);
          p.target = next[(Math.random()*next.length)|0];
        }
        p.t += 0.04;
        const a = p.node, b = p.target;
        const x = a.x + (b.x-a.x)*Math.min(1,p.t);
        const y = a.y + (b.y-a.y)*Math.min(1,p.t);
        ctx.fillStyle = ac2;
        ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
        if (p.t >= 1){ p.node = b; p.target=null; p.L++; p.t=0; }
      }
      for (const n of nodes){
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.arc(n.x,n.y,6,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = ac2; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(n.x,n.y,8,0,Math.PI*2); ctx.stroke();
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['constellation'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const ac = U.accent(el,'#9fb4ff');
    const N = 70;
    let pts = [];
    const seed = () => {
      pts = Array.from({length:N}, () => ({
        x: Math.random()*k.w, y: Math.random()*k.h,
        vx: U.rand(-0.3,0.3), vy: U.rand(-0.3,0.3)
      }));
    };
    seed();
    let lw=k.w, lh=k.h;
    const stop = U.loop(() => {
      if (k.w!==lw||k.h!==lh){ seed(); lw=k.w; lh=k.h; }
      ctx.clearRect(0,0,k.w,k.h);
      for (const p of pts){
        p.x += p.vx; p.y += p.vy;
        if (p.x<0||p.x>k.w) p.vx*=-1;
        if (p.y<0||p.y>k.h) p.vy*=-1;
      }
      for (let i=0;i<N;i++){
        for (let j=i+1;j<N;j++){
          const a=pts[i], b=pts[j];
          const d = Math.hypot(a.x-b.x, a.y-b.y);
          if (d < 150){
            ctx.globalAlpha = 1 - d/150;
            ctx.strokeStyle = ac; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = ac;
      for (const p of pts){
        ctx.beginPath(); ctx.arc(p.x,p.y,1.8,0,Math.PI*2); ctx.fill();
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['orbit-ring'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    const rings = [
      {r:40,  n:3,  sp:1.2, c:pal[0]},
      {r:75,  n:5,  sp:0.8, c:pal[1]},
      {r:110, n:8,  sp:-0.6, c:pal[2]},
      {r:145, n:12, sp:0.4, c:pal[3]},
      {r:180, n:16, sp:-0.3, c:pal[4]}
    ];
    const stop = U.loop((t) => {
      ctx.clearRect(0,0,k.w,k.h);
      const cx=k.w/2, cy=k.h/2;
      // radial glow
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,210);
      g.addColorStop(0,'rgba(124,92,255,0.25)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,k.w,k.h);
      for (const R of rings){
        ctx.strokeStyle = 'rgba(200,200,230,0.2)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(cx,cy,R.r,0,Math.PI*2); ctx.stroke();
        for (let i=0;i<R.n;i++){
          const a = (i/R.n)*Math.PI*2 + t*R.sp;
          const x = cx + Math.cos(a)*R.r;
          const y = cy + Math.sin(a)*R.r;
          ctx.fillStyle = R.c;
          ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['galaxy-swirl'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    const N = 800;
    const parts = Array.from({length:N}, (_,i) => {
      const arm = i%3;
      const t = Math.random();
      const r = t*180 + 8;
      const base = (arm/3)*Math.PI*2;
      return { r, a: base + Math.log(r+1)*1.6 + U.rand(-0.2,0.2),
               c: pal[arm%pal.length],
               s: U.rand(0.8, 2.2) };
    });
    const stop = U.loop((t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0,0,k.w,k.h);
      const cx=k.w/2, cy=k.h/2;
      for (const p of parts){
        const a = p.a + t*0.15;
        const x = cx + Math.cos(a)*p.r;
        const y = cy + Math.sin(a)*p.r*0.7;
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(x,y,p.s,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['word-cascade'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    const WORDS = ['AI','知识','Graph','Claude','LLM','Agent','Vector','RAG','Token','神经',
      'Prompt','Chain','Skill','Code','Cloud','GPU','Flow','推理','Data','Model'];
    let items = [];
    let last = -1;
    let piles = {}; // column -> stack height
    const stop = U.loop((t) => {
      ctx.clearRect(0,0,k.w,k.h);
      if (t - last > 0.18){
        last = t;
        const w = WORDS[(Math.random()*WORDS.length)|0];
        items.push({
          text: w, x: U.rand(40, k.w-40), y: -20,
          vy: 0, c: pal[(Math.random()*pal.length)|0],
          size: U.rand(16,26), landed: false
        });
      }
      ctx.textAlign='center'; ctx.textBaseline='middle';
      for (const it of items){
        if (!it.landed){
          it.vy += 0.4;
          it.y += it.vy;
          const col = Math.round(it.x/60);
          const floor = k.h - (piles[col]||0) - it.size*0.6;
          if (it.y >= floor){
            it.y = floor; it.landed = true;
            piles[col] = (piles[col]||0) + it.size*1.1;
            if ((piles[col]||0) > k.h*0.8) piles[col] = 0; // reset if too high
          }
        }
        ctx.fillStyle = it.c;
        ctx.font = `700 ${it.size}px system-ui,sans-serif`;
        ctx.fillText(it.text, it.x, it.y);
      }
      // prune old landed
      if (items.length > 120){
        items = items.filter(i => !i.landed).concat(items.filter(i=>i.landed).slice(-60));
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['letter-explode'] = function(el){
    const U = window.HPX._u;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const src = el.querySelector('[data-fx-text]') || el;
    const text = (el.getAttribute('data-fx-text-value') || src.textContent || 'EXPLODE').trim();
    // Build a container, hide source text
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;';
    const inner = document.createElement('div');
    inner.style.cssText = 'font-size:64px;font-weight:900;letter-spacing:0.02em;color:var(--text-1,#fff);white-space:nowrap;';
    wrap.appendChild(inner);
    el.appendChild(wrap);
    const spans = [];
    for (const ch of text){
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.display='inline-block';
      s.style.transform='translate(0,0)';
      s.style.transition='transform 900ms cubic-bezier(.2,.9,.3,1), opacity 900ms';
      s.style.opacity='0';
      inner.appendChild(s);
      spans.push(s);
    }
    let stopped = false;
    const run = () => {
      if (stopped) return;
      spans.forEach((s,i) => {
        const dx = U.rand(-400, 400), dy = U.rand(-300, 300);
        s.style.transition='none';
        s.style.transform=`translate(${dx}px,${dy}px) rotate(${U.rand(-180,180)}deg)`;
        s.style.opacity='0';
      });
      // force reflow
      void inner.offsetWidth;
      spans.forEach((s,i) => {
        setTimeout(() => {
          if (stopped) return;
          s.style.transition='transform 900ms cubic-bezier(.2,.9,.3,1), opacity 900ms';
          s.style.transform='translate(0,0) rotate(0deg)';
          s.style.opacity='1';
        }, i*35);
      });
    };
    run();
    const iv = setInterval(run, 4500);
    return { stop(){ stopped=true; clearInterval(iv); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['chain-react'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const ac = U.accent(el,'#7c5cff'), ac2 = U.accent2(el,'#22d3ee');
    const N = 8;
    const stop = U.loop((t) => {
      ctx.clearRect(0,0,k.w,k.h);
      const cy = k.h/2;
      const pad = 60;
      const dx = (k.w - pad*2)/(N-1);
      const period = 2.4;
      const phase = (t % period) / period; // 0..1
      for (let i=0;i<N;i++){
        const x = pad + i*dx;
        const my = i/(N-1);
        const d = Math.abs(phase - my);
        const pulse = Math.max(0, 1 - d*6);
        const r = 18 + pulse*18;
        // glow
        const g = ctx.createRadialGradient(x,cy,0,x,cy,r*2);
        g.addColorStop(0, `rgba(124,92,255,${0.4*pulse})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x-r*2, cy-r*2, r*4, r*4);
        // circle
        ctx.fillStyle = pulse>0.1 ? ac2 : ac;
        ctx.beginPath(); ctx.arc(x,cy,r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2;
        ctx.stroke();
        // connectors
        if (i<N-1){
          ctx.strokeStyle='rgba(200,200,230,0.3)'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(x+r,cy); ctx.lineTo(x+dx-r,cy); ctx.stroke();
        }
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['magnetic-field'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    const N = 60;
    const parts = Array.from({length:N}, (_,i) => ({
      phase: Math.random()*Math.PI*2,
      freq: U.rand(0.4, 1.2),
      amp: U.rand(30, 90),
      y0: U.rand(0.15, 0.85),
      c: pal[i%pal.length],
      trail: []
    }));
    const stop = U.loop((t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0,0,k.w,k.h);
      for (const p of parts){
        const x = ((t*80 + p.phase*50) % (k.w+100)) - 50;
        const y = k.h*p.y0 + Math.sin(x*0.02 + p.phase + t*p.freq)*p.amp;
        p.trail.push([x,y]);
        if (p.trail.length > 18) p.trail.shift();
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i=0;i<p.trail.length;i++){
          const [tx,ty] = p.trail[i];
          if (i===0) ctx.moveTo(tx,ty); else ctx.lineTo(tx,ty);
        }
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
      }
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['data-stream'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const ac = U.accent(el,'#22d3ee'), ac2 = U.accent2(el,'#7c5cff');
    const rows = [];
    const rh = 22;
    const genRow = (y) => ({
      y, dir: Math.random()<0.5?-1:1,
      speed: U.rand(30, 90),
      offset: Math.random()*2000,
      text: Array.from({length:120}, () => {
        const r = Math.random();
        if (r<0.3) return Math.random()<0.5?'0':'1';
        if (r<0.6) return '0x' + Math.floor(Math.random()*256).toString(16).padStart(2,'0');
        return Math.random().toString(16).slice(2,6);
      }).join(' ')
    });
    const init = () => {
      rows.length = 0;
      const n = Math.ceil(k.h/rh);
      for (let i=0;i<n;i++) rows.push(genRow(i*rh + rh*0.7));
    };
    init();
    let lh = k.h;
    const stop = U.loop((t) => {
      if (k.h!==lh){ init(); lh=k.h; }
      ctx.fillStyle = 'rgba(5,8,14,0.35)';
      ctx.fillRect(0,0,k.w,k.h);
      ctx.font = '13px ui-monospace,Menlo,monospace';
      for (let i=0;i<rows.length;i++){
        const r = rows[i];
        const x = r.dir>0
          ? ((t*r.speed + r.offset) % (k.w+400)) - 400
          : k.w - (((t*r.speed + r.offset) % (k.w+400)) - 400);
        ctx.fillStyle = (i%3===0)?ac:ac2;
        ctx.globalAlpha = 0.65 + (i%2)*0.3;
        ctx.fillText(r.text, x, r.y);
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['gradient-blob'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    const blobs = Array.from({length:4}, (_,i) => ({
      x: U.rand(0,1), y: U.rand(0,1),
      vx: U.rand(-0.08,0.08), vy: U.rand(-0.08,0.08),
      r: U.rand(180,320),
      c: pal[i%pal.length]
    }));
    const hex2rgb = (h) => {
      const m = h.replace('#','').match(/.{2}/g);
      if (!m) return [124,92,255];
      return m.map(x=>parseInt(x,16));
    };
    const stop = U.loop((t) => {
      ctx.fillStyle = 'rgba(10,12,22,0.2)';
      ctx.fillRect(0,0,k.w,k.h);
      ctx.globalCompositeOperation = 'lighter';
      for (const b of blobs){
        b.x += b.vx*0.01; b.y += b.vy*0.01;
        if (b.x<0||b.x>1) b.vx*=-1;
        if (b.y<0||b.y>1) b.vy*=-1;
        const px = b.x*k.w, py = b.y*k.h;
        const r = b.r + Math.sin(t*0.8 + b.x*6)*30;
        const [R,G,B] = hex2rgb(b.c);
        const grad = ctx.createRadialGradient(px,py,0,px,py,r);
        grad.addColorStop(0, `rgba(${R},${G},${B},0.55)`);
        grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['sparkle-trail'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    k.c.style.pointerEvents = 'none';
    el.style.cursor = 'crosshair';
    const pal = U.palette(el);
    let sparks = [];
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (let i=0;i<3;i++){
        sparks.push({
          x, y,
          vx: U.rand(-60,60), vy: U.rand(-80,20),
          life: 1, c: pal[(Math.random()*pal.length)|0],
          r: U.rand(1.5,3.5)
        });
      }
    };
    // auto-wiggle if no mouse moves
    let auto = true, autoT = 0;
    const onAny = () => { auto = false; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerenter', onAny);
    const stop = U.loop(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0,0,k.w,k.h);
      if (auto){
        autoT += 0.04;
        const x = k.w/2 + Math.cos(autoT)*k.w*0.3;
        const y = k.h/2 + Math.sin(autoT*1.3)*k.h*0.3;
        for (let i=0;i<3;i++){
          sparks.push({
            x, y,
            vx: U.rand(-60,60), vy: U.rand(-80,20),
            life: 1, c: pal[(Math.random()*pal.length)|0],
            r: U.rand(1.5,3.5)
          });
        }
      }
      const dt = 1/60;
      sparks = sparks.filter(s => s.life > 0);
      for (const s of sparks){
        s.vy += 160*dt;
        s.x += s.vx*dt; s.y += s.vy*dt;
        s.life -= 0.018;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.c;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onAny);
      el.style.cursor = '';
      stop(); k.destroy();
    }};
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['shockwave'] = function(el){
    const U = window.HPX._u;
    const k = U.canvas(el), ctx = k.ctx;
    const ac = U.accent(el,'#7c5cff'), ac2 = U.accent2(el,'#22d3ee');
    let waves = [];
    let last = -1;
    const stop = U.loop((t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0,0,k.w,k.h);
      if (t - last > 0.6){ last = t; waves.push({t:0}); }
      const cx=k.w/2, cy=k.h/2;
      const max = Math.hypot(k.w,k.h)/2;
      waves = waves.filter(w => w.t < 1);
      for (const w of waves){
        w.t += 0.012;
        const r = w.t * max;
        const alpha = 1 - w.t;
        ctx.strokeStyle = w.t<0.5?ac2:ac;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3 + (1-w.t)*3;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha*0.4;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.92,0,Math.PI*2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // core
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,40);
      g.addColorStop(0,'rgba(255,255,255,0.9)');
      g.addColorStop(1,'rgba(124,92,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx,cy,40,0,Math.PI*2); ctx.fill();
    });
    return { stop(){ stop(); k.destroy(); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['typewriter-multi'] = function(el){
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const lines = [
      (el.getAttribute('data-fx-line1') || '> initializing knowledge graph...'),
      (el.getAttribute('data-fx-line2') || '> loading 28 concept nodes'),
      (el.getAttribute('data-fx-line3') || '> agent ready. awaiting prompt_'),
    ];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:32px 48px;font:600 22px ui-monospace,Menlo,monospace;color:var(--text-1,#e7e7ef);';
    el.appendChild(wrap);
    const rows = lines.map((txt) => {
      const row = document.createElement('div');
      row.style.cssText = 'white-space:pre;display:flex;align-items:center;';
      const span = document.createElement('span'); span.textContent = '';
      const cur = document.createElement('span');
      cur.textContent = '\u2588';
      cur.style.cssText = 'display:inline-block;margin-left:2px;color:var(--accent,#22d3ee);animation:hpxBlink 1s steps(2) infinite;';
      row.appendChild(span); row.appendChild(cur);
      wrap.appendChild(row);
      return {row, span, txt, i:0};
    });
    // inject blink keyframes once
    if (!document.getElementById('hpx-blink-kf')){
      const st = document.createElement('style');
      st.id = 'hpx-blink-kf';
      st.textContent = '@keyframes hpxBlink{50%{opacity:0}}';
      document.head.appendChild(st);
    }
    let stopped = false;
    const speeds = [55, 70, 45];
    rows.forEach((r, idx) => {
      const tick = () => {
        if (stopped) return;
        if (r.i < r.txt.length){
          r.span.textContent += r.txt[r.i++];
          setTimeout(tick, speeds[idx]);
        } else {
          setTimeout(() => {
            if (stopped) return;
            r.i = 0; r.span.textContent = '';
            tick();
          }, 2200);
        }
      };
      setTimeout(tick, idx*400);
    });
    return { stop(){ stopped = true; if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } };
  };
})();
(function(){
  window.HPX = window.HPX || {};
  window.HPX['counter-explosion'] = function(el){
    const U = window.HPX._u;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const target = parseInt(el.getAttribute('data-fx-to') || '2400', 10);
    const k = U.canvas(el), ctx = k.ctx;
    const pal = U.palette(el);
    // number overlay
    const num = document.createElement('div');
    num.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 120px system-ui,sans-serif;color:var(--text-1,#fff);pointer-events:none;text-shadow:0 4px 40px rgba(124,92,255,0.5);';
    num.textContent = '0';
    el.appendChild(num);
    let parts = [];
    let state = 'count'; // count | burst | hold
    let stateT = 0;
    let value = 0;
    let cycle = 0;
    const burst = () => {
      const cx = k.w/2, cy = k.h/2;
      for (let i=0;i<120;i++){
        const a = Math.random()*Math.PI*2;
        const s = U.rand(120, 400);
        parts.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,r:U.rand(2,5),c:pal[(Math.random()*pal.length)|0]});
      }
    };
    const stop = U.loop(() => {
      ctx.clearRect(0,0,k.w,k.h);
      const dt = 1/60;
      stateT += dt;
      if (state === 'count'){
        const dur = 2.2;
        const p = Math.min(1, stateT/dur);
        const eased = 1 - Math.pow(1-p,3);
        value = Math.round(target*eased);
        num.textContent = value.toLocaleString();
        if (p >= 1){ state='burst'; stateT=0; burst(); }
      } else if (state === 'burst'){
        if (stateT > 0.05 && stateT < 0.3 && parts.length < 200) {}
        if (stateT > 2.5){ state='hold'; stateT=0; }
      } else if (state === 'hold'){
        if (stateT > 1.5){
          state='count'; stateT=0; value=0; num.textContent='0'; cycle++;
        }
      }
      parts = parts.filter(p => p.life > 0);
      for (const p of parts){
        p.vy += 260*dt; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx*dt; p.y += p.vy*dt; p.life -= 0.01;
        ctx.globalAlpha = Math.max(0,p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    return { stop(){ stop(); k.destroy(); if (num.parentNode) num.parentNode.removeChild(num); } };
  };
})();
