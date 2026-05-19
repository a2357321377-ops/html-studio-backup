// data-stream — 数据流粒子效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var streams = [];
  var count = 8;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    var particles = [];
    for (var j = 0; j < 15; j++) {
      particles.push({ offset: j * 12, alpha: 1 - j * 0.06 });
    }
    streams.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.5 + 0.5,
      particles: particles
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      var dx = Math.cos(s.angle) * s.speed;
      var dy = Math.sin(s.angle) * s.speed;
      s.x += dx; s.y += dy;
      if (s.x < -50 || s.x > canvas.width + 50 || s.y < -50 || s.y > canvas.height + 50) {
        s.x = Math.random() * canvas.width;
        s.y = Math.random() * canvas.height;
        s.angle = Math.random() * Math.PI * 2;
      }
      for (var j = 0; j < s.particles.length; j++) {
        var p = s.particles[j];
        var px = s.x - dx * p.offset;
        var py = s.y - dy * p.offset;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,200,255,' + p.alpha * 0.3 + ')';
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
