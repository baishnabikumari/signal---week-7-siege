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
