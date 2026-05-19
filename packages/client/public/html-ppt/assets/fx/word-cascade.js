// word-cascade — 文字从上方飘落
(function() {
  var canvas = document.querySelector('canvas.fx-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var words = [];
  var vocab = ['创新','数据','AI','未来','科技','设计','智能','云端','算法','模型','深度学习','分析'];
  var t = 0;

  function resize() {
    canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn() {
    if (words.length < 15 && Math.random() < 0.05) {
      words.push({
        text: vocab[Math.floor(Math.random() * vocab.length)],
        x: Math.random() * canvas.width,
        y: -20,
        speed: Math.random() * 1 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
        size: Math.random() * 10 + 10
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawn();
    for (var i = words.length - 1; i >= 0; i--) {
      var w = words[i];
      w.y += w.speed;
      if (w.y > canvas.height + 30) { words.splice(i, 1); continue; }
      ctx.font = w.size + 'px sans-serif';
      ctx.fillStyle = 'rgba(200,220,255,' + w.alpha + ')';
      ctx.fillText(w.text, w.x, w.y);
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
