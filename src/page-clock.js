const clock = document.querySelector('.mission-clock');
if (clock) {
  const refresh = () => { clock.textContent = 'UTC ' + new Date().toISOString().slice(11, 19); };
  refresh(); setInterval(refresh, 1000);
}
