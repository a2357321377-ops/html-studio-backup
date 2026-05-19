// firework — 烟花绽放效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var sparks = [];
  var timer = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function burst(x, y) {
    var hue = Math.random() * 360;
    for (var i = 0; i < 40; i++) {
      var angle = (Math.PI * 2 / 40) * i;
      var speed = Math.random() * 3 + 1;
      sparks.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: Math.random() * 0.02 + 0.01,
        hue: hue + Math.random() * 30 - 15,
        r: Math.random() * 2 + 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timer++;
    if (timer % 60 === 0) {
      burst(Math.random() * canvas.width * 0.6 + canvas.width * 0.2,
            Math.random() * canvas.height * 0.4 + canvas.height * 0.1);
    }
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.03;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ',100%,60%,' + s.life * 0.8 + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
