// neural-net — 脉冲连接动画
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var nodes = [];
  var count = 20;
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (var i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      phase: Math.random() * Math.PI * 2,
      r: 3
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.02;
    // connections
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          var pulse = Math.sin(t * 3 + i + j) * 0.5 + 0.5;
          ctx.strokeStyle = 'rgba(180,100,255,' + (1 - dist / 150) * 0.2 * pulse + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    // nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.phase += 0.03;
      var glow = Math.sin(n.phase) * 0.3 + 0.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,100,255,' + glow * 0.3 + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,150,255,' + glow + ')';
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
