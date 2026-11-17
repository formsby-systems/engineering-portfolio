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
    const wasPlaying = !video.paused;
    stopAssemblyPreview();
    if (wasPlaying) {
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


// Let the real CAD move at rest until the visitor takes over with scroll or controls.
// The video's own playback clock drives this preview; there is no second render loop.
let previewingAssembly = Boolean(video.getAttribute('src')) && !reduced.matches;
function stopAssemblyPreview() {
  if (!previewingAssembly) return;
  previewingAssembly = false;
  video.pause();
  video.loop = false;
  video.playbackRate = 1;
}
async function startAssemblyPreview() {
  if (!previewingAssembly) return;
  video.loop = true;
  video.playbackRate = .55;
  try { await video.play(); }
  catch { stopAssemblyPreview(); }
}
if (previewingAssembly) {
  video.addEventListener('loadeddata', startAssemblyPreview, {once: true});
  addEventListener('scroll', stopAssemblyPreview, {passive: true, once: true});
  const stopOnInteraction = event => {
    if (!event.target.closest('[data-play]')) stopAssemblyPreview();
  };
  hero.addEventListener('pointerdown', stopOnInteraction, {once: true});
  hero.addEventListener('keydown', stopOnInteraction, {once: true});
  reduced.addEventListener('change', stopAssemblyPreview);
  requestVideo();
  if (video.readyState >= 2) startAssemblyPreview();
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

const scorecard = document.getElementById('cardinal-explore');
if (scorecard) {
  const week = scorecard.querySelector('#cardinal-week');
  const downtime = scorecard.querySelector('#cardinal-downtime');
  const qualityOutput = scorecard.querySelector('#cardinal-quality-output');
  const timeOutput = scorecard.querySelector('#cardinal-time-output');
  const periods = [
    { label: 'June 5–11, 2025', start: 250605000, end: 250611999 },
    { label: 'June 12–18, 2025', start: 250612000, end: 250618999 },
    { label: 'June 19–25, 2025', start: 250619000, end: 250625999 },
  ];
  const metric = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const percent = (count, total) => total ? `${(100 * count / total).toFixed(1)}%` : '—';
  const escapeText = value => value.replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  ));

  async function loadQualitySample() {
    try {
      const response = await fetch('assets/cardinal-demo-data.json');
      if (!response.ok) throw new Error('Scorecard sample unavailable');
      const { units } = await response.json();
      week.addEventListener('change', () => {
        const period = periods[Number(week.value)];
        const rows = units.filter(row => Number(row.uid) >= period.start && Number(row.uid) <= period.end);
        const failed = rows.filter(row => row.result === 'Fail');
        const counts = new Map();
        for (const { defects: [defect] } of failed) {
          if (defect) counts.set(defect, (counts.get(defect) || 0) + 1);
        }
        const ranked = [...counts].sort(([left, a], [right, b]) => b - a || left.localeCompare(right));
        const particle = failed.filter(row => row.defects[0]?.includes('Particle')).length;
        const defectRows = ranked.map(([name, count]) => (
          `<tr><th scope="row">${escapeText(name.replace(' - ', ' — '))}</th><td><span class="count-bar" style="--count-share:${100 * count / failed.length}%">${count} · ${percent(count, failed.length)}</span></td></tr>`
        )).join('');
        const examples = [...failed.slice(0, 2), ...rows.filter(row => row.result === 'Pass').slice(0, 1), ...units.filter(row => Number(row.uid) < period.start || Number(row.uid) > period.end).slice(0, 1)];
        const sourceRows = examples.map(row => {
          const inWeek = Number(row.uid) >= period.start && Number(row.uid) <= period.end;
          const date = `June ${Number(row.uid.slice(4, 6))}`;
          return `<tr${inWeek ? '' : ' class="outside-week"'}><th scope="row"><code>${escapeText(row.uid)}</code><small>${date} · ${inWeek ? 'in week' : 'outside week'}</small></th><td>${inWeek ? escapeText(row.result + (row.defects[0] ? ' · ' + row.defects[0].replace(' - ', ' — ') : '')) : 'Excluded from this week'}${inWeek && row.defects[1] ? `<small>Secondary: ${escapeText(row.defects[1].replace(' - ', ' — '))}</small>` : inWeek && row.result === 'Pass' ? '<small>Still in the inspected denominator</small>' : ''}</td></tr>`;
        }).join('');
        const summary = rows.length
          ? `Particle failures accounted for <strong>${percent(particle, rows.length)} of inspected units</strong> and <strong>${percent(particle, failed.length)} of failed units</strong>.`
          : 'This week has no source records. The scorecard leaves the percentages blank.';
        qualityOutput.innerHTML = `<div class="quality-trace">
          <div class="quality-input"><h4>Inspection log</h4><p class="trace-caption">A few of the ${units.length} fictional source records. The report counts the full selected week.</p><table class="evidence-table source-records"><caption>UID → production date → primary defect</caption><thead><tr><th scope="col">Unit / date</th><th scope="col">Inspection</th></tr></thead><tbody>${sourceRows}</tbody></table><p class="trace-caption">Select by the date inside each UID. Count each failed unit’s primary defect once.</p></div>
          <div class="quality-report"><h4>${period.label} report</h4><dl class="cardinal-metrics">${metric('Inspected', rows.length)}${metric('Failed', failed.length)}${metric('Primary particle', particle)}</dl>
          <table class="evidence-table defect-bars"><caption>Primary defects, highest count first</caption><thead><tr><th scope="col">Defect</th><th scope="col">Count / failures</th></tr></thead><tbody>${defectRows || '<tr><td colspan="2">No records in this reporting week.</td></tr>'}</tbody></table><p class="explorer-result">${summary}</p></div></div>`;
      });
      week.disabled = false;
      week.dispatchEvent(new Event('change'));
    } catch {
      const note = document.createElement('p');
      note.textContent = 'The other reporting weeks could not load.';
      qualityOutput.append(note);
    }
  }

  downtime.addEventListener('input', () => {
    const down = downtime.valueAsNumber;
    if (!downtime.validity.valid || !Number.isInteger(down)) {
      timeOutput.innerHTML = '<p class="explorer-result">Enter a whole number from 0 to 1,440 minutes.</p>';
      return;
    }
    const lateStart = 120;
    const shiftSpan = 555;
    const allocated = Math.min(down, lateStart);
    const remaining = down - allocated;
    const productive = Math.max(0, shiftSpan - remaining);
    const summary = remaining > shiftSpan
      ? `${remaining} minutes of remaining downtime exceed the ${shiftSpan}-minute shift span. Reported line time is <strong>0 minutes</strong>.`
      : `${shiftSpan} minutes − ${remaining} minutes = <strong>${productive} minutes of reported line time.</strong>`;
    timeOutput.innerHTML = `
      <dl class="cardinal-metrics">${metric('Allocated to late start', `${allocated} min`)}${metric('Remaining downtime', `${remaining} min`)}${metric('Reported line time', `${(productive / 60).toFixed(2)} hr`)}</dl>
      <p class="explorer-result">${summary}</p>`;
  });
  downtime.disabled = false;
  if (downtime.value !== downtime.defaultValue) downtime.dispatchEvent(new Event('input'));
  loadQualitySample();
}

const formsbyScenario = document.getElementById('formsby-scenario');
if (formsbyScenario) {
  const output = document.getElementById('formsby-run-output');
  async function loadSearchRuns() {
    try {
      const response = await fetch('assets/formsby-processor-example.json');
      if (!response.ok) throw new Error('Recorded runs unavailable');
      const { scenarios } = await response.json();
      const escapeText = value => String(value).replace(/[&<>"']/g, character => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
      ));
      formsbyScenario.addEventListener('change', () => {
        const run = scenarios.find(item => item.id === formsbyScenario.value);
        const lanes = run.sourceResponses.map(source => `<li${source.error ? ' class="source-error"' : ''}><strong>${escapeText(source.source)}</strong><span>${source.error ? 'Timeout <small>Failure retained</small>' : source.candidates.length ? source.candidates.map(name => escapeText(name)).join('<br>') + (source.source === 'Source B' ? '<small>Same URL as A</small>' : '') : 'No candidates'}</span></li>`).join('');
        const rows = run.keptCandidates.map(candidate => {
          const match = run.matches.find(item => item.listingId === candidate.id);
          return `<tr><th scope="row">${escapeText(candidate.url.split('/').pop())}<small>Kept from ${escapeText(candidate.source)}</small></th><td>${escapeText(match.disposition)}</td></tr>`;
        }).join('');
        const explanation = run.status === 'FAILED'
          ? 'Interpretation stopped before source calls. The run is FAILED, rather than an empty successful search.'
          : run.status === 'PARTIAL'
            ? run.matches.length ? 'Both matches survive. The missing source is visible, and neither match is presented as fully accepted.' : 'No matches were saved, but a source failed. PARTIAL distinguishes missing coverage from an empty completed search.'
            : run.matches.length ? 'Both matches are accepted by the injected evaluations. The duplicate URL still produces only one candidate.' : 'All three sources completed without candidates. READY means the run completed, not that a match exists.';
        output.innerHTML = `<div class="search-sources"><h4>Source responses</h4>${lanes ? `<ol class="source-lanes">${lanes}</ol>` : '<p class="no-source-calls">No source calls. Interpretation failed first.</p>'}</div><div class="search-saved"><h4>Saved run: <strong>${escapeText(run.status)}</strong></h4><p class="search-count">${run.rawCandidateCount} candidates → <strong>${run.uniqueCandidateCount} unique URLs</strong></p><table class="evidence-table"><caption>Evaluations attached to this run</caption><thead><tr><th scope="col">Candidate</th><th scope="col">Disposition</th></tr></thead><tbody>${rows || '<tr><td colspan="2">No match evaluations saved.</td></tr>'}</tbody></table><p class="explorer-result">${explanation}</p></div>`;
      });
      formsbyScenario.disabled = false;
      formsbyScenario.dispatchEvent(new Event('change'));
    } catch {
      formsbyScenario.disabled = true;
      const note = document.createElement('p');
      note.className = 'explorer-foot';
      note.textContent = 'The other recorded cases could not load. The default partial-run example remains visible below.';
      formsbyScenario.closest('label').append(note);
    }
  }
  loadSearchRuns();
}

const operalithExample = document.querySelector('[data-operalith-example]');
if (operalithExample) {
  const receive = operalithExample.querySelector('[data-op-receive]');
  const undo = operalithExample.querySelector('[data-op-undo]');
  const output = operalithExample.querySelector('[data-op-output]');

  async function loadOperalithExample() {
    try {
      const response = await fetch('assets/operalith-example.json');
      if (!response.ok) throw new Error('Workspace example unavailable');
      const snapshots = await response.json();

      function showSnapshot(snapshot, message) {
        const rows = snapshot.supplies.map(supply => {
          const row = document.createElement('tr');
          const check = supply.gap !== null
            ? `${supply.gap} pieces below threshold`
            : supply.quantity === supply.threshold ? 'At threshold' : 'Above threshold';
          const values = [supply.title, `${supply.quantity} pieces`, String(supply.threshold), check];
          for (const [index, value] of values.entries()) {
            const cell = document.createElement(index === 0 ? 'th' : 'td');
            if (index === 0) cell.scope = 'row';
            cell.textContent = value;
            row.append(cell);
          }
          return row;
        });
        output.querySelector('tbody').replaceChildren(...rows);
        output.querySelector('.op-state').textContent = message;
      }

      receive.addEventListener('click', () => {
        showSnapshot(snapshots.received, 'Recorded 3 pads received. Protective pads are now at 5 pieces, above the threshold of 4.');
        receive.disabled = true;
        undo.disabled = false;
      });
      undo.addEventListener('click', () => {
        showSnapshot(snapshots.undone, 'Stock change undone. Protective pads are back at 2 pieces. The project, task and drill checkout are retained.');
        receive.disabled = false;
        undo.disabled = true;
      });
      receive.disabled = false;
    } catch {
      const note = document.createElement('p');
      note.className = 'op-state';
      note.textContent = 'The recorded stock changes could not load. You can still review the starting example and open the public workspace.';
      output.append(note);
    }
  }
  loadOperalithExample();
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

// Compare two actual exported builds. The slider changes only the reveal mask.
for (const comparison of document.querySelectorAll('[data-comparison]')) {
  const slider = comparison.querySelector('input[type=range]');
  const controls = comparison.querySelector('.comparison-control');
  function revealBuild() {
    const amount = Math.max(0, Math.min(100, Number(slider.value)));
    comparison.style.setProperty('--compare', `${amount}%`);
    slider.setAttribute('aria-valuetext', `${amount}% of Build B revealed over Build A`);
  }
  comparison.dataset.ready = 'true';
  controls.hidden = false;
  revealBuild();
  slider.addEventListener('input', revealBuild);
}

// An illustration of two retained checkpoints, not a new cloud execution.
for (const diagram of document.querySelectorAll('[data-recovery]')) {
  const buttons = [...diagram.querySelectorAll('[data-recovery-state]')];
  diagram.querySelector('.recovery-actions').hidden = false;
  const labels = {
    before: ['6 completed · 66 remaining', 'The first six results are preserved. The remaining 66 cases still need to run.'],
    after: ['72 completed · original six retained', 'Only the missing 66 cases run on recovery. The 72 targets join 288 unchanged earlier comparison rows.'],
  };
  for (const button of buttons) button.addEventListener('click', () => {
    const state = button.dataset.recoveryState;
    diagram.dataset.state = state;
    for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
    diagram.querySelector('[data-recovery-label]').textContent = labels[state][0];
    diagram.querySelector('[data-recovery-description]').textContent = labels[state][1];
  });
}
