const canvas = document.getElementById("telemetryChart");

if (canvas) {
  const ctx = canvas.getContext("2d");
  let time = 0;

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function drawSignal(color, offset, amp) {
    ctx.beginPath();

    for (let x = 0; x < canvas.width; x++) {
      const y =
        canvas.height / 2 +
        Math.sin(x * 0.015 + time * offset) * amp +
        Math.sin(x * 0.04 + time) * 10;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawDrift() {
    const x = canvas.width * 0.7;
    const y =
      canvas.height / 2 +
      Math.sin(x * 0.015 + time * 1.2) * 30 +
      Math.sin(x * 0.04 + time) * 10;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.strokeStyle = "rgba(245,158,11,0.25)";
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    drawSignal("#3b6cff", 0.8, 30);
    drawSignal("#2f5fff", 1.2, 25);
    drawSignal("#1f3fa8", 1.6, 18);

    drawDrift();

    time += 0.03;
    requestAnimationFrame(draw);
  }

  draw();
}