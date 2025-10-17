const canvas = document.getElementById('gameCanvas');
const scoreValue = document.getElementById('scoreValue');   //correct id (singular)
const highScoreEl = document.getElementById('highScore');   //capital G corrected
const signalFillEl = document.getElementById('signalFill'); //consistent case
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');
const statusBanner = document.getElementById('statusBanner');
const ssidInput = document.getElementById('ssidInput');

const ctx = canvas.getContext('2d',{alpha: true});

let DPR = Math.max(1, window.devicePixelRatio || 1);
let W = 0, H = 0;

const state = {
    running: false,
    lastTime: 0,
    score: 0,
    signalStrength: 1.0,
    waves: [],
    spawnTimer: 0,
    spawnInterval: 1400,
    difficultyTimer: 0,
    highScore: parseInt(localStorage.getItem('cts_high') || '0', 10) || 0,
    soundOn: true
}

//saving high score 
highScoreEl.textContent = state.highScore;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a,b) => Math.random()*(b-a)+a;

//resize
function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = Math.round(rect.width * DPR);
    H = Math.round(rect.height * DPR);
    canvas.width = W;
    canvas.height = H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resizeCanvas);


// player
const player = {
    x: 0.5,
    y: 0.78,
    baseRadius: 20,
    dx: 0,
};

let pointerDown = false;
function toNormX(clientX){
    const rect = canvas.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
}

canvas.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    player.x = toNormX(e.clientX);
});
window.addEventListener('pointermove', () => pointerDown = false);

//for keyboard
window.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowLeft' || e.key.toLowerCase()==='a') player.dx = -1;
    if(e.key === 'ArrowRight' || e.key.toLowerCase()==='d') player.dx = 1;
});
window.addEventListener('keyup', (e) => {
    if(e.key === 'ArrowLeft' || e.key === 'ArrowRight' || ['a','d'].includes(e.key.toLowerCase())) player.dx = 0;
});

//wave (pulsating signal)
function spawnWave() {
    const margin = 0.08;
    const x = rand(margin, 1 - margin);
    const y = rand(0.15, 0.85);
    const base = Math.min(canvas.clientWidth, canvas.clientHeight);
    const initialR = 8 * (base/600);
    const thickness = 12 * (base/600);
    const speed = rand(50, 140);
    const ttl = rand(1800, 4000);
    state.waves.push({x,y,r: initialR, thickness, speed, born: performance.now(), ttl, caught:false});
}

//update
function update(dt){
    state.difficultyTimer += dt;
    if(state.difficultyTimer > 10000 && state.spawnInterval > 500){
        state.spawnInterval = Math.max(500, state.spawnInterval - 120);
        state.difficultyTimer = 0;
    }
    state.spawnTimer += dt;
    if(state.spawnTimer >= state.spawnInterval){
        spawnWave();
        state.spawnTimer = 0;
    }
// updated waves
    for(let i = state.waves.length - 1; i>=0; i--){
        const wv = state.waves[i];
        wv.r += wv.speed * (dt/1000);
        const age = performance.now() - wv.born;
        if(age > wv.ttl){
            if(!wv.caught) state.signalStrength -= 0.06;
            state.waves.splice(i,1);
            continue;
        }
        const sx = wv.x*canvas.clientWidth;
        const sy = wv.y*canvas.clientHeight;
        const px = player.x*canvas.clientWidth;
        const py = player.y*canvas.clientHeight;
        const dist = Math.hypot(px - sx, py - sy);
        const ringEdge = Math.abs(dist - wv.r);
        const tolerance = Math.max(10 * (Math.min(canvas.clientWidth, canvas.clientHeight)/600), wv.thickness * 0.9);
        if(!wv.caught && ringEdge <= tolerance){
            wv.caught = true;
            const gain = Math.round(10 +(wv.speed / (Math.min(canvas.clientWidth, canvas.clientHeight)/600))*0.25);
            state.score += gain;
            state.signalStrength = clamp(state.signalStrength + 0.02, 0, 1);

            //sound
            if(state.soundOn) playTick();

            //increased thickness for the short time
            wv.thickness *= 1.5;
        }
    }
    //natural drain
    state.signalStrength -= 0.0003 * (dt/16);
    state.signalStrength = clamp(state.signalStrength, 0, 1);

    //use keyboard to move player more smoother
    if(player.dx !== 0 && !pointerDown){
        player.x += player.dx * 0.015 * 1.2;
    }
    player.x = clamp(player.x, 0.03, 0.97);

    //UI update
    scoreValue.textContent = state.score;
    signalFillEl.style.transform = `scaleX(${state.signalStrength})`;

    //game over ha ha ha ha
    if(state.signalStrength <= 0 && state.running){
        endGame();
    }
}

// rendering
function draw(){
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    ctx.clearRect(0,0,cw,ch);

    const g = ctx.createRadialGradient(cw*0.5, ch*0.4, cw*0.05, cw*0.5, ch*0.4, Math.max(cw,ch));
    g.addColorStop(0, 'rgba(60,20,80,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,cw,ch);

    //dwaing waves
    ctx.globalCompositeOperation = 'Lighter';
    for(const wv of state.waves){
        const sx = wv.x * cw;
        const sy = wv.y * ch;
        const r = wv.r;
        const grad = ctx.createRadialGradient(sx, sy, Math.max(1,r - wv.thickness*0.5), sx, sy, r + wv.thickness);
        grad.addColorStop(0, 'rgba(91,227,255,0.00)');
        grad.addColorStop(0.55, 'rgba(91,227,255,0.05)');
        grad.addColorStop(0.75, 'rgba(180,107,255,0.12)');
        grad.addColorStop(1, 'rgba(180,107,255,0.02)');

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(2, wv.thickness);
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(180,107,255,0.16)';
        ctx.arc(sx, sy, r, 0, Math.PI*2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        if(wv.caught){
            ctx.beginPath();
            ctx.fillStyle = 'rgba(180,107,255,0.16)';
            ctx.arc(sx, sy, Math.max(6, r*0.09), 0, Math.PI*2);
            ctx.fill();
        }
    }
    ctx.globalCompositeOperation = 'source-over';

    const px = player.x * cw;
    const py = player.y * ch;
    const pr = Math.max(12, player.baseRadius * (Math.min(cw,ch)/600));

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(91,227,255,0.12';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(91,277,255,0.12)';
    ctx.arc(px, py, pr * 1.6, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const orbG = ctx.createRadialGradient(px - pr*0.3, py - pr*0.3, pr*0.1, px, py, pr*1.8);
    orbG.addColorStop(0, 'rgba(255,255,255,0.95)');
    orbG.addColorStop(0.08, 'rgba(180,107,255,0.95)');
    orbG.addColorStop(0.45, 'rgba(91,227,255,0.9)');
    orbG.addColorStop(1, 'rgba(30,10,40,0.06)');
    ctx.fillStyle = orbG;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI*2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.arc(px - pr*0.25, py - pr*0.25, pr*0.28, 0, Math.PI*2);
    ctx.fill();
}

// main loop form here now
function loop(ts){
    if(!state.lastTime) state.lastTime = ts;
    const dt = ts - state.lastTime
    state.lastTime = ts;

    if(state.running){
        update(dt);
    }
    draw();
    requestAnimationFrame(loop);
}

// now controls - start and end
function startGame(){
    //for reset
    state.running = true;
    state.score = 0;
    state.signalStrength = 1;
    state.waves.length = 0;
    state.spawnInterval = 1200;
    state.spawnTimer = 0;
    state.difficultyTimer = 0;
    statusBanner.textContent = 'Running - catch signals!';
    statusBanner.className = 'status running';

    startBtn.textContent = 'Running...';
    startBtn.classList.add('primary');
}

function endGame(){
    state.running = false;
    statusBanner.textContent = 'Connection Lost - Score: ${state.score}';
    statusBanner.className = 'status';
    startBtn.textContent = 'start';

    //high score
    if(state.score > state.highScore){
        state.highScore = state.score;
        localStorage.setItem('cts_high', String(state.highScore));
        highScoreEl.textContent = state.highScore;
    }
}

startBtn.addEventListener('click', () => {
  if (state.running) {
    //pause
    state.running = false;
    startBtn.textContent = 'Start';
    statusBanner.textContent = 'Paused';
    statusBanner.className = 'status';
  } else {
    startGame();
  }
});

//sound toggle
soundToggle.addEventListener('click', ()=> {
    state.soundOn = !state.soundOn;
    soundToggle.textContent = `Sound: ${state.soundOn ? 'On' : 'Off'}`;
});

//simple sound tick
let audioCtx = null;
function ensureAudio(){
    if(!audioCtx) audioCtx = new(window.AudioContext || window.webkitAudioContext());
}

function playTick() {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 960;
    o.connect(g); //fixed that is to connect oscillator to gain node (was o.gain.value = 0)
    g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.002);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    o.stop(now + 0.1);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

// initial setup
function init(){
    resizeCanvas();
    window.requestAnimationFrame(loop);

    // restore ssid
    const stored = localStorage.getItem('cts_ssid');
    if(stored) ssidInput.value = stored;
    ssidInput.addEventListener('change', ()=> localStorage.setItem('cts_ssid', ssidInput.value || 'SIGNAL_NET'));

    // canvas for keyboard (focus)
    canvas.setAttribute('tabindex', '0');
    canvas.addEventListener('click', () => canvas.focus());

    //start paused
    statusBanner.textContent = 'Ready? - Press Start';
}

init();