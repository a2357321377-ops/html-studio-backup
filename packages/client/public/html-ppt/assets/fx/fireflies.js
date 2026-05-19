// fireflies — 萤火虫效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var flies = [];
  var count = 25;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    flies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      phase: Math.random() * Math.PI * 2,
      r: Math.random() * 2 + 1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.phase += 0.04;
      f.x += f.vx + Math.sin(f.phase) * 0.3;
      f.y += f.vy + Math.cos(f.phase * 0.7) * 0.3;
      if (f.x < 0 || f.x > canvas.width) f.vx *= -1;
      if (f.y < 0 || f.y > canvas.height) f.vy *= -1;
      var glow = 0.3 + Math.sin(f.phase) * 0.4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,255,100,' + Math.max(0, glow * 0.3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,255,150,' + Math.max(0, glow) + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
