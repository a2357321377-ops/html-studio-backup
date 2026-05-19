// waves — 波浪效果
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var w = 0; w < 3; w++) {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (var x = 0; x <= canvas.width; x += 5) {
        var y = canvas.height * 0.6 + Math.sin(x * 0.01 + t + w * 1.5) * 30 + w * 25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(100,180,255,' + (0.08 - w * 0.02) + ')';
      ctx.fill();
    }
    t += 0.02;
    requestAnimationFrame(draw);
  }
  draw();
})();
