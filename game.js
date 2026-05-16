'use strict';

const GAME_TIME = 60;
const LANES = ['←','↓','↑','→'];

const titleScreen = document.getElementById('titleScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const homeBtn = document.getElementById('homeBtn');
const shareBtn = document.getElementById('shareBtn');

const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const timeLeftEl = document.getElementById('timeLeft');

const finalScoreEl = document.getElementById('finalScore');
const rankTextEl = document.getElementById('rankText');
const resultCommentEl = document.getElementById('resultComment');

const judgeTextEl = document.getElementById('judgeText');
const danceTimeEl = document.getElementById('danceTime');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/* 画像 */
const dancerImg = new Image();
dancerImg.src = 'dance.png';

/* BGM */
const bgm = new Audio('bgm.mp3');
bgm.loop = false;
bgm.volume = 0.75;

let notes = [];
let score = 0;
let combo = 0;
let running = false;
let startTime = 0;
let lastTime = 0;
let animationId = null;
let nextSpawn = 0;
let judgeTimer = null;

function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
}

window.addEventListener('resize', resizeCanvas);

function showScreen(screen){
  [titleScreen, gameScreen, resultScreen].forEach(s => {
    s.classList.remove('active');
  });
  screen.classList.add('active');
}

function isDanceTime(sec){
  return sec >= 20 && sec <= 40;
}

function startGame(){
  showScreen(gameScreen);
  resizeCanvas();

  notes = [];
  score = 0;
  combo = 0;

  scoreEl.textContent = 0;
  comboEl.textContent = 0;
  timeLeftEl.textContent = GAME_TIME;
  judgeTextEl.textContent = '';

  startTime = performance.now();
  lastTime = startTime;
  nextSpawn = 0;
  running = true;

  bgm.pause();
  bgm.currentTime = 0;
  bgm.play().catch(() => {});

  loop(startTime);
}

function endGame(){
  running = false;
  cancelAnimationFrame(animationId);

  bgm.pause();
  bgm.currentTime = 0;

  danceTimeEl.classList.remove('active');
  document.body.classList.remove('danceFlash');

  finalScoreEl.textContent = score;

  let rank = '崩壊';
  let comment = 'ステップは崩れた。';

  if(score >= 15000){
    rank = '発狂';
    comment = '完全に発狂していた。';
  }else if(score >= 10000){
    rank = '同調';
    comment = '歪みと同調していた。';
  }else if(score >= 5000){
    rank = '歪';
    comment = '変だけど悪くない。';
  }

  rankTextEl.textContent = rank;
  resultCommentEl.textContent = comment;

  showScreen(resultScreen);
}

function spawnNote(sec){
  notes.push({
    lane: Math.floor(Math.random() * 4),
    y: -60,
    speed: 130,
    dance: isDanceTime(sec),
    hit: false,
    miss: false
  });
}

function getJudgeY(){
  return canvas.height - 90;
}

function updateNotes(dt, sec){
  if(sec >= nextSpawn){
    spawnNote(sec);

    nextSpawn = sec + (
      isDanceTime(sec)
        ? 0.9 + Math.random() * 0.3
        : 1.15 + Math.random() * 0.45
    );
  }

  const judgeY = getJudgeY();

  notes.forEach(note => {
    note.y += note.speed * dt;

    if(!note.hit && !note.miss && note.y > judgeY + 90){
      note.miss = true;
      combo = 0;
      comboEl.textContent = combo;
      showJudge('MISS');
    }
  });

  notes = notes.filter(note => note.y < canvas.height + 100 && !note.hit);
}

function drawBackground(dance){
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = dance
    ? 'rgba(91,42,160,.14)'
    : 'rgba(91,42,160,.06)';

  for(let y = 0; y < canvas.height; y += 16){
    for(let x = 0; x < canvas.width; x += 16){
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function drawDancer(sec){
  if(!dancerImg.complete) return;

  const cols = 3;
  const rows = 3;
  const totalFrames = 9;

  const dance = isDanceTime(sec);
  const fps = dance ? 10 : 6;

  const frame = Math.floor(sec * fps) % totalFrames;

  const sx = (frame % cols) * (dancerImg.width / cols);
  const sy = Math.floor(frame / cols) * (dancerImg.height / rows);
  const sw = dancerImg.width / cols;
  const sh = dancerImg.height / rows;

  const size = Math.min(canvas.width * 0.58, canvas.height * 0.38);
  const dx = canvas.width / 2 - size / 2;
  const dy = canvas.height * 0.47 - size / 2;

  ctx.save();

  ctx.globalAlpha = dance ? 0.24 : 0.18;

  if(dance){
    const shake = Math.sin(sec * 16) * 4;
    ctx.translate(shake, 0);
  }

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    dancerImg,
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    size,
    size
  );

  ctx.restore();
}

function drawLanes(){
  const laneW = canvas.width / 4;

  for(let i = 0; i < 4; i++){
    const x = i * laneW;

    ctx.strokeStyle = '#d8c1ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 0, laneW, canvas.height);

    ctx.fillStyle = '#5b2aa0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LANES[i], x + laneW / 2, 28);
  }
}

function drawJudgeLine(){
  const y = getJudgeY();
  const laneW = canvas.width / 4;

  ctx.fillStyle = '#5b2aa0';
  ctx.fillRect(0, y - 3, canvas.width, 6);

  for(let i = 0; i < 4; i++){
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(i * laneW + 10, y - 22, laneW - 20, 44);

    ctx.strokeStyle = '#5b2aa0';
    ctx.lineWidth = 3;
    ctx.strokeRect(i * laneW + 10, y - 22, laneW - 20, 44);

    ctx.fillStyle = '#5b2aa0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LANES[i], i * laneW + laneW / 2, y);
  }
}

function drawNotes(sec){
  const laneW = canvas.width / 4;

  notes.forEach(note => {
    let x = note.lane * laneW + laneW / 2;

    if(note.dance){
      x += Math.sin(note.y * 0.03 + sec * 5) * 22;
    }

    const y = note.y;

    ctx.fillStyle = '#5b2aa0';
    ctx.fillRect(x - 30, y - 30, 60, 60);

    ctx.strokeStyle = '#5b2aa0';
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 30, y - 30, 60, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LANES[note.lane], x, y + 1);
  });
}

function draw(sec){
  const dance = isDanceTime(sec);

  drawBackground(dance);
  drawDancer(sec);
  drawLanes();
  drawJudgeLine();
  drawNotes(sec);
}

function handleInput(lane){
  if(!running) return;

  const judgeY = getJudgeY();

  let best = null;
  let bestDist = 9999;

  notes.forEach(note => {
    if(note.lane !== lane) return;
    if(note.hit || note.miss) return;

    const dist = Math.abs(note.y - judgeY);

    if(dist < bestDist){
      bestDist = dist;
      best = note;
    }
  });

  if(best && bestDist <= 100){
    best.hit = true;
    combo++;

    let add = 300;

    if(bestDist <= 45){
      add = 500;
      showJudge('GOOD');
    }else{
      showJudge('OK');
    }

    score += add + combo * 10;

    scoreEl.textContent = score;
    comboEl.textContent = combo;
  }else{
    combo = 0;
    comboEl.textContent = combo;
    showJudge('MISS');
  }
}

function showJudge(text){
  judgeTextEl.textContent = text;

  clearTimeout(judgeTimer);

  judgeTimer = setTimeout(() => {
    judgeTextEl.textContent = '';
  }, 300);
}

function loop(now){
  if(!running) return;

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const sec = (now - startTime) / 1000;
  const remain = Math.max(0, Math.ceil(GAME_TIME - sec));

  timeLeftEl.textContent = remain;

  const dance = isDanceTime(sec);

  danceTimeEl.classList.toggle('active', dance);
  document.body.classList.toggle('danceFlash', dance);

  updateNotes(dt, sec);
  draw(sec);

  if(sec >= GAME_TIME){
    endGame();
    return;
  }

  animationId = requestAnimationFrame(loop);
}

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);

homeBtn.addEventListener('click', () => {
  location.href = 'https://afoolhippo.github.io/home/?skipTitle=1';
});

shareBtn.addEventListener('click', () => {
  const text =
`歪なダンスを踊った。

SCORE ${score}
称号：${rankTextEl.textContent}

https://afoolhippo.github.io/game17/

#歪なダンス
#カバゲーセン`;

  window.open(
    'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text),
    '_blank'
  );
});

document.querySelectorAll('.tapBtn').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    handleInput(Number(btn.dataset.lane));
  });
});

window.addEventListener('keydown', e => {
  const map = {
    ArrowLeft: 0,
    ArrowDown: 1,
    ArrowUp: 2,
    ArrowRight: 3
  };

  if(map[e.key] !== undefined){
    handleInput(map[e.key]);
  }
});