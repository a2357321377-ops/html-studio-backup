// shockwave — 冲击波扩散效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var waves = [];
  var timer = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timer++;
    if (timer % 80 === 0) {
      waves.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: 0,
        maxR: Math.max(canvas.width, canvas.height) * 0.6,
        speed: 3
      });
    }
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      w.r += w.speed;
      var progress = w.r / w.maxR;
      if (progress >= 1) { waves.splice(i, 1); continue; }
      var alpha = (1 - progress) * 0.3;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,200,255,' + alpha + ')';
      ctx.lineWidth = 2 * (1 - progress);
      ctx.stroke();
      // inner ring
      if (w.r > 20) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r - 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(150,220,255,' + alpha * 0.5 + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
