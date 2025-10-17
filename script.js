const canvas = document.getElementsById('gameCanvas');
const scoreValue = document.getElementById('scoreValues');
const highScoreEl = document.getelementById('highScore');
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');
const statusBanner = document.getElementById('statusBanner');
const signalFillEl = document.getElementById('signalfill');
const ssidInput = document.getElementById('ssidInput');
const ctx = canvas.getContext.getContext('2d',{alpha: true});

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
highScoreEl.textContext = state.highScore;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a,b) => Math.random()*(b-a)+a;

//resize
function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = Math.round(rect.width*DPR);
    H = Math.round(rect.width*DPR);
    canvas.width = W;
    canvas.width = H;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', ()=>{resizeCanvas(); });


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
    if(pointerDown) player.x = toNormX(e.clientX);
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
function spawnWave(){
    const margin = 0.08;
    const x = rand(margin, 1 - margin);
    const y = rand(0.15, 0.85);
    const base = Math.min(canvas.clientWidth, canvas.clientHeight);
    const initialR = 8*(base/600);
    const thickness = 12*(base/6000);
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
