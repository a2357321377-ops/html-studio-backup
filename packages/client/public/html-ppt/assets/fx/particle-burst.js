// particle-burst — 粒子从中心向外扩散
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn() {
    var cx = canvas.width / 2, cy = canvas.height / 2;
    for (var i = 0; i < 3; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 2 + 0.5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 2 + 1,
        life: 1,
        decay: Math.random() * 0.01 + 0.005
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawn();
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,180,255,' + p.life * 0.6 + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
