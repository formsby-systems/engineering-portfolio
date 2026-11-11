const hero = document.querySelector('.hero');
const bar = document.querySelector('.bar');
const video = document.querySelector('[data-drive]');
const range = document.querySelector('#drive-position');
const play = document.querySelector('[data-play]');
const scrollMode = document.querySelector('[data-scroll-mode]');
const progress = document.querySelector('[data-position]');
const note = document.querySelector('[data-note]');
const annotations = document.querySelector('[data-annotations]');
const labelParts = document.querySelector('[data-label-parts]');
const figure = document.querySelector('.hero-figure');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let following = !reduced.matches;
let requested = false;
let target = 0;
let scheduled = false;

function showProgress(value) {
  const percent = Math.round(value * 100);
  range.value = percent;
  figure.style.setProperty('--ring-turn', String(value * 360) + 'deg');
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
  if (bounds.bottom <= bar.offsetHeight) return;
  const stickyHeight = hero.firstElementChild.offsetHeight;
  const distance = bounds.height - stickyHeight;
  const traveled = distance >= 2
    ? hero.firstElementChild.getBoundingClientRect().top - bounds.top
    : bar.offsetHeight - bounds.top;
  const scrollSpan = distance >= 2 ? distance : Math.min(270, bounds.height * .45);
  if (traveled > 0 || requested) scrub(traveled / scrollSpan);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(followScroll);
}

function setPartLabels(show) {
  annotations.hidden = !show;
  labelParts.setAttribute('aria-pressed', String(show));
  figure.classList.toggle('is-annotated', show);
}

function setFollowing(value) {
  following = value;
  scrollMode.setAttribute('aria-pressed', String(value));
  if (value) {
    setPartLabels(false);
    schedule();
  }
}

if (video.getAttribute('src')) {
  hero.classList.add('has-drive');
  document.querySelector('[data-controls]').hidden = false;
  note.textContent = reduced.matches ? 'Use the slider to turn the assembly' : 'Scroll to turn the assembly';
  scrollMode.hidden = reduced.matches;
  setFollowing(following);

  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  reduced.addEventListener('change', () => {
    scrollMode.hidden = reduced.matches;
    note.textContent = reduced.matches ? 'Use the slider to turn the assembly' : 'Scroll to turn the assembly';
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
    note.textContent = 'Wilbur Powerhouse CAD';
  });
  labelParts.addEventListener('click', () => {
    const show = annotations.hidden;
    if (show) {
      video.pause();
      setFollowing(false);
      scrub(0);
    }
    setPartLabels(show);
  });
  range.addEventListener('input', () => {
    setPartLabels(false);
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
    setPartLabels(false);
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
lightSwitch.hidden = false;
function setWorkbenchLight(night) {
  document.body.dataset.theme = night ? 'night' : 'day';
  lightSwitch.setAttribute('aria-pressed', String(night));
  document.querySelector('[data-light-label]').textContent = night ? 'Day mode' : 'Night mode';
}
try { setWorkbenchLight(localStorage.getItem('workbench-light') === 'night'); }
catch { setWorkbenchLight(false); }
lightSwitch.addEventListener('click', () => {
  const night = document.body.dataset.theme !== 'night';
  setWorkbenchLight(night);
  try { localStorage.setItem('workbench-light', night ? 'night' : 'day'); } catch {}
});
for (const explorer of document.querySelectorAll('[data-explorer]')) {
  const controls = explorer.querySelector('.explorer-controls');
  const buttons = [...controls.querySelectorAll('button')];
  const panels = [...explorer.querySelectorAll('[data-explorer-panel]')];
  function select(button) {
    const panelId = button.getAttribute('aria-controls');
    for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
    for (const panel of panels) panel.hidden = panel.id !== panelId;
  }
  select(buttons[0]);
  controls.hidden = false;
  controls.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button) select(button);
  });
}

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
