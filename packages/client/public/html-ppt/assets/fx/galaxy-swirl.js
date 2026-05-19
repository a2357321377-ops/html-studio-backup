// galaxy-swirl — 银河旋转效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var points = [];
  var count = 300;
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    var dist = Math.random() * 200 + 20;
    var angle = Math.random() * Math.PI * 2;
    points.push({
      dist: dist,
      angle: angle,
      speed: 0.002 / (dist * 0.01 + 1),
      r: Math.random() * 1.5 + 0.5,
      hue: 200 + Math.random() * 60
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cx = canvas.width / 2, cy = canvas.height / 2;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      p.angle += p.speed;
      var x = cx + Math.cos(p.angle) * p.dist;
      var y = cy + Math.sin(p.angle) * p.dist * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.hue + ',70%,70%,0.3)';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
