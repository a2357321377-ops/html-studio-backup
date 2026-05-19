// counter-explosion — 数字碎片飞散
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var fragments = [];
  var timer = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function explode() {
    var cx = canvas.width / 2, cy = canvas.height / 2;
    var num = Math.floor(Math.random() * 900 + 100);
    var str = String(num);
    for (var i = 0; i < str.length; i++) {
      var angle = (Math.PI * 2 / str.length) * i + Math.random() * 0.5;
      var speed = Math.random() * 3 + 1;
      fragments.push({
        char: str[i],
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        life: 1,
        decay: Math.random() * 0.008 + 0.004,
        size: Math.random() * 20 + 16
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timer++;
    if (timer % 120 === 0) explode();
    for (var i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.04;
      f.rot += f.rotSpeed;
      f.life -= f.decay;
      if (f.life <= 0) { fragments.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.font = 'bold ' + f.size + 'px monospace';
      ctx.fillStyle = 'rgba(255,200,50,' + f.life * 0.5 + ')';
      ctx.fillText(f.char, 0, 0);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
