// orbit-ring — 环形轨道运动
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var t = 0;
  var orbits = [
    { r: 80, speed: 0.02, dots: 3, hue: 200 },
    { r: 130, speed: -0.015, dots: 4, hue: 260 },
    { r: 180, speed: 0.01, dots: 5, hue: 320 }
  ];

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cx = canvas.width / 2, cy = canvas.height / 2;
    for (var o = 0; o < orbits.length; o++) {
      var orb = orbits[o];
      // ring
      ctx.beginPath();
      ctx.arc(cx, cy, orb.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + orb.hue + ',60%,60%,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // dots
      for (var d = 0; d < orb.dots; d++) {
        var angle = t * orb.speed + (Math.PI * 2 / orb.dots) * d;
        var x = cx + Math.cos(angle) * orb.r;
        var y = cy + Math.sin(angle) * orb.r;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + orb.hue + ',80%,70%,0.6)';
        ctx.fill();
        // glow
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + orb.hue + ',80%,70%,0.15)';
        ctx.fill();
      }
    }
    t++;
    requestAnimationFrame(draw);
  }
  draw();
})();
