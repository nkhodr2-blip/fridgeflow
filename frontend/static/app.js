let planData = null;
let startEpoch = null;
let interval = null;

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function createPlan() {
  clearTimers();
  const ingredients = document.getElementById('ingredients').value;
  const timeLimit = parseInt(document.getElementById('timeLimit').value, 10) || 30;
  const mode = document.getElementById('mode').value;
  const res = await fetch('/api/plan', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ingredients, time_limit_min: timeLimit, mode})
  });
  if(!res.ok){
    const err = await res.json().catch(()=>({detail:'Unknown error'}));
    alert('Error: ' + (err.detail || res.statusText));
    return;
  }
  planData = await res.json();
  renderPlan();
}

function renderPlan(){
  const out = document.getElementById('output');
  out.innerHTML = '';
  if(!planData) return;

  const dish = document.createElement('div');
  dish.className = 'card';
  dish.innerHTML = `<h2>${planData.dish}</h2>
                    <div class="badge">Generated plan</div>`;
  out.appendChild(dish);

  const stepsCard = document.createElement('div');
  stepsCard.className = 'card';
  stepsCard.innerHTML = `<div class="controls">
      <button class="primary" onclick="startPlan()">Start timeline</button>
      <button onclick="behind()">I'm behind</button>
      <button onclick="clearTimers()">Reset</button>
    </div>
    <hr>
    <div id="steps"></div>`;
  out.appendChild(stepsCard);

  const subs = document.createElement('div');
  subs.className = 'card';
  subs.innerHTML = `<h3>Substitutions & tips</h3>
    <ul>${(planData.substitutions||[]).map(s=>`<li>${s}</li>`).join('') || '<li>No tips available.</li>'}</ul>`;
  out.appendChild(subs);

  const stepsEl = document.getElementById('steps');
  (planData.steps||[]).forEach((st, idx)=>{
    const div = document.createElement('div');
    div.className = 'step';
    div.id = 'step-'+idx;
    div.innerHTML = `<strong>${idx+1}. ${st.label}</strong><br>
      <span class="badge">starts @ +${fmt(st.start_offset_sec)}</span>
      <div>Remaining: <span class="countdown" id="cd-${idx}">-</span></div>`;
    stepsEl.appendChild(div);
  });
}

function startPlan(){
  if(!planData) return;
  startEpoch = Date.now() / 1000;
  tick(); // immediate
  interval = setInterval(tick, 500);
}

function clearTimers(){
  if(interval) clearInterval(interval);
  interval = null;
  startEpoch = null;
  if(planData){
    planData.steps.forEach((_, idx)=>{
      const cd = document.getElementById('cd-'+idx);
      if(cd) cd.textContent = '-';
      const step = document.getElementById('step-'+idx);
      if(step){ step.classList.remove('running','done'); }
    });
  }
}

function behind(){
  if(!planData || startEpoch === null) return;
  const now = Date.now()/1000;
  const elapsed = now - startEpoch;

  // Push all FUTURE start offsets by +120 sec
  planData.steps.forEach(st=>{
    if(st.start_offset_sec > elapsed){
      st.start_offset_sec += 120;
    }
  });

  // Extend duration of current step by +60 sec if one is running
  const idx = currentStepIndex(elapsed);
  if(idx !== -1){
    planData.steps[idx].duration_sec += 60;
  }

  // Rerender & restart so the refreshed offsets apply cleanly
  renderPlan();
  startEpoch = now;
  startPlan();
}

function currentStepIndex(elapsed){
  for(let i=0;i<planData.steps.length;i++){
    const st = planData.steps[i];
    const start = st.start_offset_sec;
    const end = start + st.duration_sec;
    if(elapsed >= start && elapsed < end) return i;
  }
  return -1;
}

function tick(){
  const now = Date.now()/1000;
  const elapsed = now - startEpoch;
  (planData.steps||[]).forEach((st, idx)=>{
    const cd = document.getElementById('cd-'+idx);
    const stepEl = document.getElementById('step-'+idx);
    const start = st.start_offset_sec;
    const end = start + st.duration_sec;
    if(elapsed < start){
      cd.textContent = fmt(start - elapsed);
      stepEl.classList.remove('running','done');
    } else if(elapsed >= start && elapsed < end){
      cd.textContent = fmt(end - elapsed);
      stepEl.classList.add('running');
      stepEl.classList.remove('done');
    } else {
      cd.textContent = "0:00";
      stepEl.classList.remove('running');
      stepEl.classList.add('done');
    }
  });
}

window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('generate').addEventListener('click', createPlan);
});