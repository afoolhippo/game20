'use strict';

const GAME_TIME = 60;

const LANES = ['←','↓','↑','→'];

const dancerImg = new Image();
dancerImg.src = 'dance.png';

const bgm = new Audio('bgm.mp3');
bgm.loop = false;
bgm.volume = 0.75;

const seGood = new Audio('se_good.mp3');
seGood.volume = 0.28;

const seBad = new Audio('se_bad.mp3');
seBad.volume = 0.18;

const titleScreen = document.getElementById('titleScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

const startBtn = document.getElementById('startBtn');
const titleImage = document.getElementById('titleImage');

const retryBtn = document.getElementById('retryBtn');
const homeBtn = document.getElementById('homeBtn');
const shareBtn = document.getElementById('shareBtn');
const backBtn = document.getElementById('backBtn');

const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const timeLeftEl = document.getElementById('timeLeft');

const finalScoreEl = document.getElementById('finalScore');
const rankTextEl = document.getElementById('rankText');
const rankStarsEl = document.getElementById('rankStars');

const judgeTextEl = document.getElementById('judgeText');
const danceTimeEl = document.getElementById('danceTime');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

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

  [titleScreen, gameScreen, resultScreen]
  .forEach(s => s.classList.remove('active'));

  screen.classList.add('active');
}

function isDanceTime(sec){

  return sec >= 30 && sec <= 50;
}

function startGame(){

  showScreen(gameScreen);

  resizeCanvas();

  notes = [];

  score = 0;
  combo = 0;

  scoreEl.textContent = 0;
  comboEl.textContent = 0;

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

  let rank = 'イギーなダンス';
  let stars = '★☆☆';
  let frame = 0;

  if(score >= 40){

    rank = 'イビツなダンス';
    stars = '★★★';
    frame = 8;

  }else if(score >= 20){

    rank = 'イキなダンス';
    stars = '★★☆';
    frame = 4;
  }

  rankTextEl.textContent = rank;
  rankStarsEl.textContent = stars;

  drawResultFrame(frame);

  showScreen(resultScreen);
}

function drawResultFrame(frame){

  if(!dancerImg.complete) return;

  const sw = dancerImg.width / 3;
  const sh = dancerImg.height / 3;

  const sx = (frame % 3) * sw;
  const sy = Math.floor(frame / 3) * sh;

  resultCanvas.width = 160;
  resultCanvas.height = 160;

  resultCtx.imageSmoothingEnabled = false;

  resultCtx.clearRect(0,0,160,160);

  resultCtx.drawImage(
    dancerImg,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    160,
    160
  );
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

      ? 0.65 + Math.random() * 0.2

      : 1.15 + Math.random() * 0.45
    );
  }

  const judgeY = getJudgeY();

  notes.forEach(note => {

    note.y += note.speed * dt;

    if(
      !note.hit &&
      !note.miss &&
      note.y > judgeY + 72
    ){

      note.miss = true;

      combo = 0;

      comboEl.textContent = combo;

      playBad();

      showJudge('MISS');
    }
  });

  notes = notes.filter(note => {

    return note.y < canvas.height + 100 && !note.hit;
  });
}

function drawBackground(dance){

  ctx.fillStyle = '#ffffff';

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.fillStyle = dance

    ? 'rgba(91,42,160,.14)'

    : 'rgba(91,42,160,.06)';

  for(let y = 0; y < canvas.height; y += 16){

    for(let x = 0; x < canvas.width; x += 16){

      ctx.fillRect(x,y,2,2);
    }
  }
}

function drawDancer(sec){

  if(!dancerImg.complete) return;

  const dance = isDanceTime(sec);

  const fps = dance ? 14 : 6;

  const frame =
    Math.floor(sec * fps) % 9;

  const sw = dancerImg.width / 3;
  const sh = dancerImg.height / 3;

  const sx = (frame % 3) * sw;
  const sy = Math.floor(frame / 3) * sh;

  const size = Math.min(
    canvas.width * 0.58,
    canvas.height * 0.38
  );

  let dx = canvas.width / 2 - size / 2;

  if(dance){

    dx += Math.sin(sec * 18) * 12;
  }

  const dy =
    canvas.height * 0.48 - size / 2;

  ctx.save();

  ctx.globalAlpha = dance ? 0.24 : 0.18;

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

    ctx.strokeRect(
      x,
      0,
      laneW,
      canvas.height
    );
  }
}

function drawJudgeLine(){

  const y = getJudgeY();

  ctx.fillStyle = '#5b2aa0';

  ctx.fillRect(
    0,
    y - 4,
    canvas.width,
    8
  );
}

function drawNotes(sec){

  const laneW = canvas.width / 4;
  const judgeY = getJudgeY();

  notes.forEach(note => {

    let x =
      note.lane * laneW +
      laneW / 2;

    if(note.dance){

      x += Math.sin(
        note.y * 0.02 + sec * 8
      ) * 80;
    }

    const y = note.y;

    const dist =
      Math.abs(y - judgeY);

    const isTiming =
      dist <= 72;

    const blinkOn =
      Math.floor(sec * 12) % 2 === 0;

    if(isTiming && blinkOn){

      ctx.fillStyle = '#ff4fd8';

    }else{

      ctx.fillStyle = '#5b2aa0';
    }

    ctx.fillRect(
      x - 30,
      y - 30,
      60,
      60
    );

    ctx.strokeStyle = isTiming
      ? '#ff4fd8'
      : '#ffffff';

    ctx.lineWidth = isTiming ? 5 : 4;

    ctx.strokeRect(
      x - 30,
      y - 30,
      60,
      60
    );

    ctx.fillStyle = '#ffffff';

    ctx.font = 'bold 42px sans-serif';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
      LANES[note.lane],
      x,
      y + 1
    );
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

function playGood(){

  seGood.currentTime = 0;

  seGood.play();
}

function playBad(){

  seBad.currentTime = 0;

  seBad.play();
}

function handleInput(lane){

  if(!running) return;

  const judgeY = getJudgeY();

  let best = null;

  let bestDist = 9999;

  notes.forEach(note => {

    if(note.lane !== lane) return;

    if(note.hit || note.miss) return;

    const dist =
      Math.abs(note.y - judgeY);

    if(dist < bestDist){

      bestDist = dist;

      best = note;
    }
  });

  if(best && bestDist <= 72){

    best.hit = true;

    combo++;

    let add = 1;

    if(bestDist <= 28){

      add = 3;

      showJudge('GOOD');

    }else{

      showJudge('OK');
    }

    playGood();

    score += add;

    scoreEl.textContent = score;

    comboEl.textContent = combo;

  }else{

    combo = 0;

    comboEl.textContent = combo;

    playBad();

    showJudge('MISS');
  }
}

function showJudge(text){

  judgeTextEl.textContent = text;

  clearTimeout(judgeTimer);

  judgeTimer = setTimeout(() => {

    judgeTextEl.textContent = '';

  },300);
}

function loop(now){

  if(!running) return;

  const dt = Math.min(
    (now - lastTime) / 1000,
    0.05
  );

  lastTime = now;

  const sec =
    (now - startTime) / 1000;

  const remain = Math.max(
    0,
    Math.ceil(GAME_TIME - sec)
  );

  timeLeftEl.textContent = remain;

  const dance = isDanceTime(sec);

  danceTimeEl.classList.toggle(
    'active',
    dance
  );

  document.body.classList.toggle(
    'danceFlash',
    dance
  );

  updateNotes(dt, sec);

  draw(sec);

  if(sec >= GAME_TIME){

    endGame();

    return;
  }

  animationId =
    requestAnimationFrame(loop);
}

startBtn.addEventListener(
  'click',
  startGame
);

titleImage.addEventListener(
  'click',
  startGame
);

retryBtn.addEventListener(
  'click',
  () => {

    showScreen(titleScreen);
  }
);

backBtn.addEventListener(
  'click',
  () => {

    running = false;

    cancelAnimationFrame(animationId);

    bgm.pause();
    bgm.currentTime = 0;

    showScreen(titleScreen);
  }
);

homeBtn.addEventListener(
  'click',
  () => {

    location.href =
    'https://afoolhippo.github.io/home/?skipTitle=1';
  }
);

shareBtn.addEventListener(
  'click',
  () => {

    const text =
`「${rankTextEl.textContent}」だった。🕺

SCORE ${score}

無料ブラウザゲーム
「歪なダンス」

https://afoolhippo.github.io/game20/

#歪なダンス
#カバゲーセン`;

    window.open(
      'https://twitter.com/intent/tweet?text='
      + encodeURIComponent(text),
      '_blank'
    );
  }
);

document
.querySelectorAll('.tapBtn')
.forEach(btn => {

  btn.addEventListener(
    'pointerdown',
    e => {

      e.preventDefault();

      handleInput(
        Number(btn.dataset.lane)
      );
    }
  );
});

window.addEventListener(
  'keydown',
  e => {

    const map = {

      ArrowLeft:0,
      ArrowDown:1,
      ArrowUp:2,
      ArrowRight:3
    };

    if(map[e.key] !== undefined){

      handleInput(map[e.key]);
    }
  }
);