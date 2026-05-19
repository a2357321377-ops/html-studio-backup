// sparkle-trail — 闪烁尾迹效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var sparkles = [];
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.02;
    // spawn along a moving path
    var px = canvas.width / 2 + Math.cos(t * 1.3) * canvas.width * 0.3;
    var py = canvas.height / 2 + Math.sin(t * 0.9) * canvas.height * 0.3;
    sparkles.push({
      x: px + (Math.random() - 0.5) * 10,
      y: py + (Math.random() - 0.5) * 10,
      r: Math.random() * 2 + 1,
      life: 1,
      decay: Math.random() * 0.03 + 0.01
    });
    for (var i = sparkles.length - 1; i >= 0; i--) {
      var s = sparkles[i];
      s.life -= s.decay;
      if (s.life <= 0) { sparkles.splice(i, 1); continue; }
      var alpha = s.life * (Math.sin(s.life * 20) * 0.3 + 0.7);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,230,150,' + Math.max(0, alpha) * 0.6 + ')';
      ctx.fill();
    }
    if (sparkles.length > 200) sparkles.splice(0, sparkles.length - 200);
    requestAnimationFrame(draw);
  }
  draw();
})();
