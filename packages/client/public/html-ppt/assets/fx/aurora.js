// aurora — 极光效果
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
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.3);
      for (var x = 0; x <= canvas.width; x += 3) {
        var y = canvas.height * 0.3 + Math.sin(x * 0.005 + t + i * 0.8) * 60
              + Math.sin(x * 0.01 + t * 1.3 + i) * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height * 0.7);
      ctx.lineTo(0, canvas.height * 0.7);
      ctx.closePath();
      var hue = 120 + i * 30 + Math.sin(t) * 20;
      ctx.fillStyle = 'hsla(' + hue + ',80%,60%,0.06)';
      ctx.fill();
    }
    t += 0.01;
    requestAnimationFrame(draw);
  }
  draw();
})();
