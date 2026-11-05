(() => {
  const clip = document.querySelector('#cad-clip');
  if (!clip) return;
  const panel = document.querySelector('#motion-controls');
  const play = document.querySelector('#play');
  const scrub = document.querySelector('#scrub');
  const scroll = document.querySelector('#scroll-mode');
  const status = document.querySelector('#media-status');
  const assembly = document.querySelector('#assembly');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrollEnabled = false;
  let scrollOrigin = 0;
  let scrollDistance = 320;
  let pending = null;
  let tick = 0;
  let loadTimer = 0;

  function showStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }
  function hasDuration() {
    return Number.isFinite(clip.duration) && clip.duration > 0;
  }
  function setScroll(on) {
    scrollEnabled = on && !reduced.matches;
    scroll.setAttribute('aria-pressed', String(scrollEnabled));
  }
  function seek(progress) {
    pending = Math.max(0, Math.min(1, progress));
    if (!hasDuration()) {
      if (clip.preload === 'none') {
        clip.preload = 'metadata';
        clip.load();
        clearTimeout(loadTimer);
        loadTimer = setTimeout(() => {
          if (!hasDuration()) fail();
        }, 7000);
      }
      return;
    }
    const nextTime = Math.min(pending * clip.duration, clip.duration - .01);
    if (Math.abs(clip.currentTime - nextTime) >= .012) clip.currentTime = nextTime;
    if (clip.readyState >= 2) clip.hidden = false;
  }
  function fail() {
    clip.pause();
    clip.hidden = true;
    setScroll(false);
    showStatus('Animation unavailable. The current CAD still remains visible.');
  }
  function sync() {
    play.textContent = clip.paused ? 'Play study' : 'Pause study';
    if (hasDuration() && !clip.seeking) scrub.value = String(Math.round(100 * clip.currentTime / clip.duration));
  }
  function scrollFrame() {
    tick = 0;
    if (!scrollEnabled) return;
    const bounds = assembly.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
    seek((scrollY - scrollOrigin) / scrollDistance);
    scrub.value = String(Math.round(pending * 100));
  }
  panel.hidden = false;
  scroll.hidden = reduced.matches;
  clip.addEventListener('loadedmetadata', () => {
    clearTimeout(loadTimer);
    if (pending !== null) seek(pending);
  });
  for (const name of ['loadeddata','playing','seeked']) {
    clip.addEventListener(name, () => { clip.hidden = false; showStatus(''); sync(); });
  }
  for (const name of ['timeupdate','pause','ended']) clip.addEventListener(name, sync);
  clip.addEventListener('error', fail);
  play.addEventListener('click', async () => {
    setScroll(false);
    if (!clip.paused) { clip.pause(); return; }
    if (clip.ended) clip.currentTime = 0;
    if (clip.readyState < 2) showStatus('Loading the CAD study…');
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => { if (clip.readyState < 2) fail(); }, 7000);
    try { await clip.play(); } catch (error) {
      if (error.name !== 'AbortError') fail();
    } finally {
      clearTimeout(loadTimer);
    }
  });
  scrub.addEventListener('input', () => {
    setScroll(false);
    clip.pause();
    seek(Number(scrub.value) / 100);
  });
  scroll.addEventListener('click', () => {
    clip.pause();
    setScroll(!scrollEnabled);
    if (scrollEnabled) {
      scrollDistance = Math.max(120, Math.min(350, assembly.getBoundingClientRect().bottom - 70));
      scrollOrigin = scrollY - Number(scrub.value) / 100 * scrollDistance;
      scrollFrame();
    }
  });
  window.addEventListener('scroll', () => {
    if (scrollEnabled && !tick) tick = requestAnimationFrame(scrollFrame);
  }, { passive: true });
  reduced.addEventListener('change', () => {
    scroll.hidden = reduced.matches;
    if (reduced.matches) { setScroll(false); clip.pause(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) clip.pause();
    }).observe(assembly);
  }
})();
