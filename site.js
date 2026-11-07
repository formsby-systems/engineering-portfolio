const hero = document.querySelector('.hero');
const video = document.querySelector('[data-drive]');
const range = document.querySelector('#drive-position');
const play = document.querySelector('[data-play]');
const scrollMode = document.querySelector('[data-scroll-mode]');
const progress = document.querySelector('[data-position]');
const note = document.querySelector('[data-note]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let following = !reduced.matches;
let requested = false;
let target = 0;
let scheduled = false;

function showProgress(value) {
  const percent = Math.round(value * 100);
  range.value = percent;
  document.querySelector('.hero-figure').style.setProperty('--ring-turn', String(value * 360) + 'deg');
  progress.value = String(percent).padStart(2, '0') + '%';
}

function seek() {
  if (!Number.isFinite(video.duration) || video.seeking || !video.paused) return;
  const time = Math.min(video.duration - 0.02, target * video.duration);
  if (Math.abs(video.currentTime - time) > 0.015) video.currentTime = time;
}

function requestVideo() {
  if (requested) return;
  requested = true;
  video.preload = 'auto';
  video.load();
}

function scrub(value) {
  target = Math.min(1, Math.max(0, value));
  showProgress(target);
  requestVideo();
  seek();
}

function followScroll() {
  scheduled = false;
  if (!following) return;
  const bounds = hero.getBoundingClientRect();
  const stickyHeight = hero.firstElementChild.offsetHeight;
  const distance = bounds.height - stickyHeight;
  if (distance < 2) return;
  const traveled = hero.firstElementChild.getBoundingClientRect().top - bounds.top;
  if (traveled > 0 || requested) scrub(traveled / distance);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(followScroll);
}

function setFollowing(value) {
  following = value;
  scrollMode.setAttribute('aria-pressed', String(value));
  scrollMode.textContent = value ? 'Scroll sync' : 'Sync off';
  if (value) schedule();
}

if (video.getAttribute('src')) {
  hero.classList.add('has-drive');
  document.querySelector('[data-controls]').hidden = false;
  note.textContent = reduced.matches ? 'Wilbur Powerhouse · Use the ring slider' : 'Wilbur Powerhouse · Scroll to drive the ring';
  scrollMode.hidden = reduced.matches;
  setFollowing(following);

  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  reduced.addEventListener('change', () => {
    scrollMode.hidden = reduced.matches;
    note.textContent = reduced.matches ? 'Wilbur Powerhouse · Use the ring slider' : 'Wilbur Powerhouse · Scroll to drive the ring';
    if (reduced.matches) video.pause();
    setFollowing(!reduced.matches);
  });
  video.addEventListener('loadedmetadata', seek);
  video.addEventListener('loadeddata', () => { video.hidden = false; });
  video.addEventListener('seeked', () => {
    video.hidden = false;
    seek();
  });
  video.addEventListener('timeupdate', () => {
    if (!video.paused) showProgress(video.currentTime / video.duration);
  });
  video.addEventListener('play', () => { play.textContent = 'Pause'; });
  video.addEventListener('pause', () => { play.textContent = 'Play'; });
  video.addEventListener('ended', () => {
    target = 1;
    showProgress(target);
    play.textContent = 'Replay';
  });
  video.addEventListener('error', () => {
    video.hidden = true;
    setFollowing(false);
    hero.classList.remove('has-drive');
    document.querySelector('[data-controls]').hidden = true;
    note.textContent = 'Current CAD assembly · Motion unavailable';
  });
  range.addEventListener('input', () => {
    const value = Number(range.value) / 100;
    video.pause();
    setFollowing(false);
    scrub(value);
  });
  scrollMode.addEventListener('click', () => {
    video.pause();
    setFollowing(!following);
  });
  play.addEventListener('click', async () => {
    if (!video.paused) {
      video.pause();
      target = video.currentTime / video.duration;
      showProgress(target);
      return;
    }
    setFollowing(false);
    requestVideo();
    if (video.ended || (Number.isFinite(video.duration) && video.duration - video.currentTime < .05)) video.currentTime = 0;
    try { await video.play(); }
    catch { note.textContent = 'Use the ring slider to move through the study.'; }
  });
}


// Small workbench interactions: no tracking or external requests.
const lightSwitch = document.querySelector('[data-light-switch]');
const gapSwitch = document.querySelector('[data-gap]');
lightSwitch.hidden = false;
function setWorkbenchLight(night) {
  document.body.dataset.theme = night ? 'night' : 'day';
  lightSwitch.setAttribute('aria-pressed', String(night));
  document.querySelector('[data-light-label]').textContent = night ? 'Lights on' : 'Lights out';
}
try { setWorkbenchLight(localStorage.getItem('workbench-light') === 'night'); }
catch { setWorkbenchLight(false); }
lightSwitch.addEventListener('click', () => {
  const night = document.body.dataset.theme !== 'night';
  setWorkbenchLight(night);
  try { localStorage.setItem('workbench-light', night ? 'night' : 'day'); } catch {}
});
document.querySelector('.gap-controls').hidden = false;
gapSwitch.addEventListener('click', () => {
  const gap = gapSwitch.getAttribute('aria-pressed') !== 'true';
  gapSwitch.setAttribute('aria-pressed', String(gap));
  gapSwitch.innerHTML = gap ? 'Remove the gap <span aria-hidden="true">↙</span>' : 'Add a price gap <span aria-hidden="true">↗</span>';
  document.querySelector('[data-gap-note]').textContent = gap ? '100 → 103 · The rules disagree.' : '100 → 100 · Both rules agree.';
  document.querySelectorAll('[data-gap-case]').forEach(row => {
    row.classList.toggle('selected-case', row.dataset.gapCase === (gap ? 'gap' : 'flat'));
  });
});
let readingScheduled = false;
function updateReading() {
  readingScheduled = false;
  const available = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.reading-progress').style.transform = 'scaleX(' + (available > 0 ? scrollY / available : 0) + ')';
}
addEventListener('scroll', () => {
  if (!readingScheduled) { readingScheduled = true; requestAnimationFrame(updateReading); }
}, {passive: true});
addEventListener('resize', updateReading);
updateReading();
