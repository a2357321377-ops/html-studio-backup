// gradient-blob — 流动渐变气泡
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var blobs = [];
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < 4; i++) {
    blobs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 100 + 80,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      hue: Math.random() * 360
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.005;
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      b.x += b.vx + Math.sin(t + i) * 0.5;
      b.y += b.vy + Math.cos(t * 0.7 + i) * 0.5;
      if (b.x < -b.r) b.x = canvas.width + b.r;
      if (b.x > canvas.width + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = canvas.height + b.r;
      if (b.y > canvas.height + b.r) b.y = -b.r;
      var grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      var hue = (b.hue + t * 20) % 360;
      grad.addColorStop(0, 'hsla(' + hue + ',70%,50%,0.15)');
      grad.addColorStop(1, 'hsla(' + hue + ',70%,50%,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
