// magnetic-field — 磁力线效果
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
    var cx = canvas.width / 2, cy = canvas.height / 2;
    for (var i = 0; i < 12; i++) {
      var startAngle = (Math.PI * 2 / 12) * i + t * 0.3;
      ctx.beginPath();
      for (var s = 0; s < 100; s++) {
        var dist = s * 2.5;
        var angle = startAngle + Math.sin(s * 0.05 + t) * 0.5;
        var x = cx + Math.cos(angle) * dist;
        var y = cy + Math.sin(angle) * dist;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(100,150,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    t += 0.01;
    requestAnimationFrame(draw);
  }
  draw();
})();
