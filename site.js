(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const init = viewer => {
    const clip = viewer.querySelector('video');
    if (!clip) return;
    const controls = viewer.querySelector('.viewer-controls');
    const play = viewer.querySelector('[data-play]');
    const scroll = viewer.querySelector('[data-scroll]');
    const range = viewer.querySelector('input[type=range]');
    const status = viewer.querySelector('.viewer-status');
    const orbit = viewer.dataset.viewer === 'orbit';
    let active = false, paused = false, pending = null, raf = 0, timeout = 0, requested = false;
    const finite = () => Number.isFinite(clip.duration) && clip.duration > 0;
    const updateStatus = text => { status.textContent = text; status.hidden = !text; };
    const sync = () => {
      play.textContent = clip.paused ? (orbit ? 'Play orbit' : 'Play explosion') : 'Pause';
      if (range && finite() && !clip.seeking) range.value = String(Math.round(100 * clip.currentTime / clip.duration));
    };
    const state = () => {
      if (!scroll) return;
      scroll.hidden = reduced.matches || !('IntersectionObserver' in window);
      scroll.textContent = paused ? 'Resume scroll spin' : 'Pause scroll spin';
      scroll.setAttribute('aria-pressed', String(paused));
      const hint = viewer.querySelector('[data-scroll-hint]');
      if (hint) hint.textContent = scroll.hidden ? 'Use Play orbit to turn the model.' : paused ? 'Scroll spin paused.' : 'Scroll to turn the model.';
    };
    const fail = () => {
      clearTimeout(timeout);
      clip.pause(); clip.hidden = true; paused = true; state();
      updateStatus('The video is unavailable. The CAD still is shown.');
    };
    const request = () => {
      if (requested) return;
      requested = true;
      clip.preload = 'metadata';
      clip.load();
      timeout = setTimeout(() => { if (!finite()) fail(); }, 7500);
    };
    const seek = progress => {
      pending = Math.min(1, Math.max(0, progress));
      if (!finite()) { request(); return; }
      const time = Math.min(clip.duration - .015, pending * clip.duration);
      if (!clip.seeking && Math.abs(time - clip.currentTime) > .025) clip.currentTime = time;
    };
    const frame = () => {
      raf = 0;
      if (!orbit || !active || paused || reduced.matches || !clip.paused) return;
      const bounds = viewer.querySelector('.viewer-stage').getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < innerHeight) seek((innerHeight - bounds.top) / (innerHeight + bounds.height));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(frame); };
    clip.addEventListener('loadedmetadata', () => { clearTimeout(timeout); if (pending !== null) seek(pending); });
    for (const event of ['loadeddata','seeked','playing']) clip.addEventListener(event, () => { clip.hidden = false; updateStatus(''); sync();
      if (event === 'seeked' && pending !== null && clip.paused) seek(pending);
    });
    for (const event of ['timeupdate','pause','ended']) clip.addEventListener(event, sync);
    clip.addEventListener('error', fail);
    play.addEventListener('click', async () => {
      pending = null;
      if (orbit) { paused = true; state(); }
      if (!clip.paused) { clip.pause(); return; }
      if (clip.ended) clip.currentTime = 0;
      if (clip.readyState < 2) updateStatus('Loading the CAD study…');
      clearTimeout(timeout);
      timeout = setTimeout(() => { if (clip.readyState < 2) fail(); }, 7500);
      try { await clip.play(); } catch (error) { if (error.name !== 'AbortError') fail(); }
      finally { clearTimeout(timeout); }
    });
    scroll?.addEventListener('click', () => { clip.pause(); paused = !paused; state(); schedule(); });
    range?.addEventListener('input', () => { clip.pause(); seek(Number(range.value)/100); });
    if (orbit && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        active = entry.isIntersecting;
        if (!active) clip.pause(); else schedule();
      }).observe(viewer);
      addEventListener('scroll', schedule, {passive:true});
      addEventListener('resize', schedule);
      reduced.addEventListener('change', () => { state(); if (reduced.matches) { clip.pause(); clip.hidden = true; } else schedule(); });
    } else if (scroll) scroll.hidden = true;
    state(); controls.hidden = false;
  };
  document.querySelectorAll('[data-viewer]').forEach(init);
  const actions = document.querySelector('.scratch-actions');
  if (actions) {
    const buttons = [...actions.querySelectorAll('[data-check]')];
    const result = document.querySelector('#scratch-result');
    actions.hidden = false;
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      result.textContent = button.dataset.check === 'dates' ? 'The dates match both columns: 20 sample units.' : 'No header contains “Week 16”. The cells hold dates, so that lookup can’t find the units.';
    }));
  }
})();
