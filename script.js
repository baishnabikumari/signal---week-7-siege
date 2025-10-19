const canvas = document.getElementById('gameCanvas');
const scoreValue = document.getElementById('scoreValue');   //correct id (singular)
const highScoreEl = document.getElementById('highScore');   //capital G corrected
const signalFillEl = document.getElementById('signalFill'); //consistent case
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');
const statusBanner = document.getElementById('statusBanner');
const ssidInput = document.getElementById('ssidInput');
const playerEl = document.getElementById('player');
const restartBtn = document.getElementById('restartBtn');
const bgMusic = document.getElementById('bg-music');

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
    highScore: 0,
    soundOn: true
};

// loads highscore 
const savedHigh = localStorage.getItem('cts_high');
if (savedHigh) state.highScore = parseInt(savedHigh, 10);

//saving high score 
highScoreEl.textContent = state.highScore;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a,b) => Math.random()*(b-a)+a;

//resize
function resizeCanvas() {
    const stage = document.getElementById('stage');
    const rect = stage.getBoundingClientRect();

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const W = Math.round(rect.width * DPR);
    const H = Math.round(rect.height * DPR);

    canvas.width = W;
    canvas.height = H;

    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);

    ctx.imageSmoothingEnabled = true;

    ctx.clearRect(0, 0, W / DPR, H / DPR);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();



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
window.addEventListener('pointermove', (e) => {
    if (pointerDown) player.x = toNormX(e.clientX);
});

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


//warning and explosion code
let warningTimer = null;
let countdownInterval = null;
let countdownEl = null;
const warningImg = document.getElementById('warningImg');
const explosionImg = document.getElementById('explosionImg');

function checkPlayerBoundary(){
    const margin = 0.02;
    if (player.x < margin || player.x > 1 - margin || player.y < 0.1 || player.y > 0.9) {
        if (!warningTimer) triggerWarning();
    } else {
        cancelWarning();
    }
}

function triggerWarning() {
    let countdown = 5;
    if (!countdownEl) {
        countdownEl = document.createElement('div');
        countdownEl.className = 'countdown';
        document.getElementById('stage').appendChild(countdownEl);
    }
    countdownEl.textContent = countdown;
    warningImg.classList.add('show');

    countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            triggerExplosion();
        }
    }, 1000);
    warningTimer = true;
}

function cancelWarning() {
    if (warningTimer) {
        warningImg.classList.remove('show');
        if(countdownEl) countdownEl.textContent = '';
        clearInterval(countdownInterval);
        warningTimer = null;
    }
}

function triggerExplosion() {
    cancelWarning();
    explosionImg.classList.add('show');

    try {
        const boom = new Audio('assets/explosion.mp3');
        boom.volume = 0.8;
        boom.play();
    } catch (err) {
        console.warn("Explosion sound failed", err);
    }
    setTimeout(() => {
        explosionImg.classList.remove('show');
        endGame();
    }, 1200);
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
    for(let i = state.waves.length - 1; i >= 0; i--){
        const wv = state.waves[i];
        wv.r += wv.speed * (dt / 1000);
        const age = performance.now() - wv.born;
        if(age > wv.ttl){
            if(!wv.caught) state.signalStrength -= 0.06;
            state.waves.splice(i, 1);
            continue;
        }
        const sx = wv.x * canvas.clientWidth;
        const sy = wv.y * canvas.clientHeight;
        const px = player.x * canvas.clientWidth;
        const py = player.y * canvas.clientHeight;
        const dist = Math.hypot(px - sx, py - sy);
        const ringEdge = Math.abs(dist - wv.r);
        const tolerance = Math.max(10 * (Math.min(canvas.clientWidth, canvas.clientHeight) / 600), wv.thickness * 0.9);
        if(!wv.caught && ringEdge <= tolerance){
            wv.caught = true;
            const gain = Math.round(10 + (wv.speed / (Math.min(canvas.clientWidth, canvas.clientHeight) / 600)) * 0.25);
            state.score += gain;
            state.signalStrength = clamp(state.signalStrength + 0.02, 0, 1);

            if(state.soundOn) playTick();

            wv.thickness *= 1.5;
        }
    }

    //natural drain
    state.signalStrength -= 0.0003 * (dt / 16);
    state.signalStrength = clamp(state.signalStrength, 0, 1);

    //use keyboard to move player more smoother thanit was before
    if(player.dx !== 0 && !pointerDown){
        player.x += player.dx * 0.015 * 1.2;
    }

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const playerRadiusX = (playerEl.offsetWidth / 2) / cw;
    const playerRadiusY = (playerEl.offsetHeight / 2) / ch;

    player.x = clamp(player.x, playerRadiusX, 1 - playerRadiusX);
    player.y = clamp(player.y, playerRadiusY, 1 - playerRadiusY);

    if (playerEl) {
        const px = player.x * cw;
        const py = player.y * ch;

        playerEl.style.left = `${px - playerEl.offsetWidth / 2}px`;
        playerEl.style.top = `${py - playerEl.offsetHeight / 2}px`;
    }

    if (player.dx < 0){
        playerEl.classList.add('move-left');
        playerEl.classList.remove('move-right');
    } else if (player.dx > 0) {
        playerEl.classList.add('move-right');
        playerEl.classList.remove('move-left');
    } else {
        playerEl.classList.remove('move-left', 'move-right');
    }

    //UI update
    scoreValue.textContent = state.score;
    signalFillEl.style.transform = `scaleX(${state.signalStrength})`;

    checkPlayerBoundary();

    //game over ha ha ha ha
    if(state.signalStrength <= 0 && state.running){
        endGame();
    }
}

// rendering
function draw() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    ctx.clearRect(0, 0, cw, ch);

    const g = ctx.createRadialGradient(cw * 0.5, ch * 0.4, cw * 0.05, cw * 0.5, ch * 0.4, Math.max(cw, ch));
    g.addColorStop(0, 'rgba(60,20,80,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    ctx.globalCompositeOperation = 'lighter';
    for (const wv of state.waves) {
        const sx = wv.x * cw;
        const sy = wv.y * ch;
        const r = wv.r;
        const grad = ctx.createRadialGradient(
            sx, sy,
            Math.max(1, r - wv.thickness * 0.5),
            sx, sy,
            r + wv.thickness
        );

        grad.addColorStop(0, 'rgba(0,227,255,0.0)');
        grad.addColorStop(0.55, 'rgba(0,225,255,1)');
        grad.addColorStop(0.75, 'rgba(52,6,98,1)');
        grad.addColorStop(1, 'rgba(255,0,212,0.49)');

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(2, wv.thickness);
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(200,150,255,0.6)';
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (wv.caught) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(180,107,255,0.16)';
            ctx.arc(sx, sy, Math.max(6, r * 0.09), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalCompositeOperation = 'source-over';

    const px = player.x * cw;
    const py = player.y * ch;
    const pr = Math.max(12, player.baseRadius * (Math.min(cw, ch) / 600));
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
    cancelWarning();
    warningTimer = null;
    clearInterval(countdownInterval);
    if (countdownEl) countdownEl.textContent = '';
    if (explosionImg) explosionImg.classList.remove('show');

    player.x = 0.5;
    player.y = 0.78;
    player.dx = 0;
    pointerDown = false;
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
    restartBtn.classList.add('hidden');//hidden restart button when game starts

    if (!isMusicOn) {
        toggleMusic();
    }

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    playerEl.style.left = `${player.x * cw - 30}px`;
    playerEl.style.top = `${player.y * ch - 30}px`;
}

function endGame(){
    state.running = false;

    //music pause if the game is over
    if (isMusicOn) {
        bgMusic.pause();
        isMusicOn = false;
        soundToggle.textContent = "Sound- OFF";
    }

    statusBanner.textContent = `Connection Lost - Score: ${state.score}`;// sorry the old is not having blackticks so i added it now!
    statusBanner.className = 'status';

    startBtn.textContent = 'start';
    startBtn.classList.remove('primary');

    restartBtn.classList.remove('hidden');

    //high score
    if(state.score > state.highScore){
        state.highScore = state.score;
        localStorage.setItem('cts_high', String(state.highScore));
    }

    highScoreEl.textContent = state.highScore;
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

restartBtn.addEventListener('click', startGame);

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

let isMusicOn = false; // off by default
function toggleMusic(){
    if(isMusicOn) {
        bgMusic.pause();
        isMusicOn = false;
        console.log("Music Paused");
    } else {
        bgMusic.volume = 0.3;
        bgMusic.play();
        isMusicOn = true;
        console.log("Music is Playing Now!!");
    }
}

//sound button
soundToggle.addEventListener("click", () => {
  toggleMusic();
  soundToggle.textContent = isMusicOn ? "Sound- ON" : "Sound- OFF";
});


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

window.addEventListener("DOMContentLoaded", init);
