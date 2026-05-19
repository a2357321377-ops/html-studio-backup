// confetti-cannon — 五彩纸屑飘落
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var pieces = [];
  var colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bff','#ff9f43'];

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn() {
    if (pieces.length < 80) {
      for (var i = 0; i < 2; i++) {
        pieces.push({
          x: Math.random() * canvas.width,
          y: -10,
          w: Math.random() * 8 + 4,
          h: Math.random() * 4 + 2,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          speed: Math.random() * 2 + 1,
          drift: (Math.random() - 0.5) * 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.7
        });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawn();
    for (var i = pieces.length - 1; i >= 0; i--) {
      var p = pieces[i];
      p.y += p.speed;
      p.x += p.drift + Math.sin(p.y * 0.02) * 0.5;
      p.rot += p.rotSpeed;
      if (p.y > canvas.height + 20) { pieces.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
