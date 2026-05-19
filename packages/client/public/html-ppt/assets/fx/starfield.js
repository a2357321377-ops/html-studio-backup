// starfield — 星空穿越效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var stars = [];
  var count = 200;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    stars.push({
      x: (Math.random() - 0.5) * canvas.width * 2,
      y: (Math.random() - 0.5) * canvas.height * 2,
      z: Math.random() * canvas.width
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cx = canvas.width / 2, cy = canvas.height / 2;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.z -= 2;
      if (s.z <= 0) {
        s.x = (Math.random() - 0.5) * canvas.width * 2;
        s.y = (Math.random() - 0.5) * canvas.height * 2;
        s.z = canvas.width;
      }
      var sx = (s.x / s.z) * 200 + cx;
      var sy = (s.y / s.z) * 200 + cy;
      var r = (1 - s.z / canvas.width) * 2;
      if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height) continue;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - s.z / canvas.width) * 0.8 + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
