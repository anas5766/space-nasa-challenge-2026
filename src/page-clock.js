const clock = document.querySelector('.mission-clock');
let elapsed = 128 * 3600 + 4 * 60 + 12;
setInterval(() => {
  elapsed += 1;
  clock.textContent = `MET ${String(Math.floor(elapsed / 3600)).padStart(3, '0')}:${String(Math.floor(elapsed % 3600 / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
}, 1000);
