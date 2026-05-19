// gradient — 渐变流动效果
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
    var x1 = canvas.width * 0.5 + Math.sin(t) * canvas.width * 0.3;
    var y1 = canvas.height * 0.5 + Math.cos(t * 0.7) * canvas.height * 0.3;
    var x2 = canvas.width * 0.5 + Math.cos(t * 1.3) * canvas.width * 0.3;
    var y2 = canvas.height * 0.5 + Math.sin(t * 0.9) * canvas.height * 0.3;
    var grad = ctx.createLinearGradient(x1, y1, x2, y2);
    var hue1 = (t * 30) % 360;
    var hue2 = (hue1 + 60) % 360;
    grad.addColorStop(0, 'hsla(' + hue1 + ',70%,50%,0.15)');
    grad.addColorStop(0.5, 'hsla(' + ((hue1 + hue2) / 2) + ',70%,50%,0.1)');
    grad.addColorStop(1, 'hsla(' + hue2 + ',70%,50%,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    t += 0.005;
    requestAnimationFrame(draw);
  }
  draw();
})();
