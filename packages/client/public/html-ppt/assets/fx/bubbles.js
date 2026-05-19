// bubbles — 气泡上升效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var bubbles = [];
  var count = 30;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    bubbles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      r: Math.random() * 15 + 5,
      speed: Math.random() * 1 + 0.3,
      alpha: Math.random() * 0.3 + 0.1,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      b.y -= b.speed;
      b.wobble += 0.02;
      b.x += Math.sin(b.wobble) * 0.5;
      if (b.y + b.r < 0) {
        b.y = canvas.height + b.r;
        b.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + b.alpha + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
