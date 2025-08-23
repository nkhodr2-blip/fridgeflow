// Minimal UI logic: fetch a plan and render it, with timeline controls.
let plan = null;
let startEpoch = null;
let driftSec = 0;

function $(sel) { return document.querySelector(sel); }
function secondsToMinSec(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

async function generatePlan() {
  const ingredients = $('#ingredients').value;
  const timeLimit = Number($('#time_limit').value || 30);
  const mode = $('#mode').value; // IMPORTANT: send selected mode

  const resp = await fetch('/api/plan', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      ingredients: ingredients,
      time_limit_min: timeLimit,
      mode: mode
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    alert(`Error: ${resp.status} ${err.detail || resp.statusText}`);
    return;
  }

  plan = await resp.json();
  renderPlan(plan);
}

function renderPlan(p) {
  $('#dish').textContent = p.dish || 'Plan';
  const stepsEl = $('#steps'); stepsEl.innerHTML = '';
  for (const step of p.steps || []) {
    const li = document.createElement('li');
    li.textContent = `${step.label} — start @ ${secondsToMinSec(step.start_offset_sec)} for ${secondsToMinSec(step.duration_sec)}`;
    stepsEl.appendChild(li);
  }
  const subsEl = $('#subs'); subsEl.innerHTML = '';
  for (const s of p.substitutions || []) {
    const li = document.createElement('li'); li.textContent = s; subsEl.appendChild(li);
  }
}

function startTimeline() {
  if (!plan) return alert('Generate a plan first.');
  startEpoch = Date.now();
  driftSec = 0;
}

function imBehind() {
  // Add 60s drift to push schedule forward a bit
  driftSec += 60;
}

function resetAll() {
  plan = null;
  startEpoch = null;
  driftSec = 0;
  $('#dish').textContent = '';
  $('#steps').innerHTML = '';
  $('#subs').innerHTML = '';
  $('#ingredients').value = '';
}

$('#generate-btn').addEventListener('click', generatePlan);
$('#start-timeline-btn').addEventListener('click', startTimeline);
$('#behind-btn').addEventListener('click', imBehind);
$('#reset-btn').addEventListener('click', resetAll);

// Optional: show live countdowns next to steps (simple text tick)
setInterval(() => {
  if (!plan || startEpoch === null) return;
  const now = Date.now();
  const elapsed = Math.floor((now - startEpoch) / 1000) - driftSec;
  const lis = Array.from($('#steps').children);

  for (let i = 0; i < lis.length; i++) {
    const step = plan.steps[i];
    const start = step.start_offset_sec;
    const end = step.start_offset_sec + step.duration_sec;
    let status;

    if (elapsed < start) {
      status = ` (starts in ${secondsToMinSec(start - elapsed)})`;
    } else if (elapsed >= start && elapsed < end) {
      status = ` (time left ${secondsToMinSec(end - elapsed)})`;
    } else {
      status = ` (done)`;
    }
    // Update line text (label + timing)
    lis[i].textContent = `${step.label} — start @ ${secondsToMinSec(step.start_offset_sec)} for ${secondsToMinSec(step.duration_sec)}${status}`;
  }
}, 1000);
