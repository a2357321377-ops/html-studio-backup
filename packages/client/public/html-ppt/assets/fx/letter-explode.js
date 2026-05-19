// letter-explode — 字母碎片飞散
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var fragments = [];
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var timer = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function explode() {
    var cx = canvas.width / 2, cy = canvas.height / 2;
    for (var i = 0; i < 20; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 4 + 1;
      fragments.push({
        char: chars[Math.floor(Math.random() * chars.length)],
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 1,
        decay: Math.random() * 0.01 + 0.005,
        size: Math.random() * 16 + 10
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timer++;
    if (timer % 90 === 0) explode();
    for (var i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.03;
      f.rot += f.rotSpeed;
      f.life -= f.decay;
      if (f.life <= 0) { fragments.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.font = f.size + 'px monospace';
      ctx.fillStyle = 'rgba(255,180,100,' + f.life * 0.6 + ')';
      ctx.fillText(f.char, 0, 0);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
