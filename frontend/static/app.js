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

  // Force LLM mode
  const mode = 'llm';

  try {
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

    // If backend fell back (based on dish label), show the notice
    const isFallback = typeof plan.dish === 'string' && plan.dish.toLowerCase().includes('fallback');
    $('#notice').style.display = isFallback ? 'block' : 'none';

    renderPlan(plan);
  } catch (e) {
    console.error('Fetch failed', e);
    alert('Network error. See Console for details.');
  }
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

function imBehind() { driftSec += 60; }

function resetAll() {
  plan = null; startEpoch = null; driftSec = 0;
  $('#notice').style.display = 'none';
  $('#dish').textContent = '';
  $('#steps').innerHTML = '';
  $('#subs').innerHTML = '';
  $('#ingredients').value = '';
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('FridgeFlow ready (LLM-only)');
  $('#generate-btn').addEventListener('click', generatePlan);
  $('#start-timeline-btn').addEventListener('click', startTimeline);
  $('#behind-btn').addEventListener('click', imBehind);
  $('#reset-btn').addEventListener('click', resetAll);
});

// Optional live countdowns
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
    if (elapsed < start) status = ` (starts in ${secondsToMinSec(start - elapsed)})`;
    else if (elapsed < end) status = ` (time left ${secondsToMinSec(end - elapsed)})`;
    else status = ` (done)`;
    lis[i].textContent = `${step.label} — start @ ${secondsToMinSec(step.start_offset_sec)} for ${secondsToMinSec(step.duration_sec)}${status}`;
  }
}, 1000);
