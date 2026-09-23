const welcome = document.querySelector('#welcome');
const continueButton = document.querySelector('#continueButton');
const zodiac = document.querySelector('#zodiac');
const zodiacContinueButton = document.querySelector('#zodiacContinueButton');
const zodiacBackButton = document.querySelector('#zodiacBackButton');
const farewell = document.querySelector('#farewell');
const farewellBackButton = document.querySelector('#farewellBackButton');
const secretStar = document.querySelector('#secretStar');
const secretNote = document.querySelector('#secretNote');
const musicPlayer = document.querySelector('#musicPlayer');
const youtubePlayer = document.querySelector('#youtubePlayer');
const songStatus = document.querySelector('#songStatus');
const progressBar = document.querySelector('#progressBar');
const card = document.querySelector('#card');
const welcomeTitle = document.querySelector('#welcomeTitle');
const photoFrame = document.querySelector('#photoFrame');
const finalNote = document.querySelector('#finalNote');

// Дуу хэддэх секундээс эхлэхийг энд тохируулна (0 = эхнээс нь)
const SONG_START_SECONDS = 0;
let player = null;
let isSongPlaying = false;
let hasStarted = false;
let playerReady = false;
let pendingPlay = false;
let progressTimer = null;

// Өнөөдрийн зурхайг horoscope.json-оос (GitHub Actions өдөр бүр шинэчилдэг) ачаална
const horoscopeTitle = document.querySelector('#horoscopeTitle');
const horoscopeText = document.querySelector('#horoscopeText');
const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const loadHoroscope = async () => {
  try {
    const response = await fetch(`horoscope.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const { days } = await response.json();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(new Date());
    const entry = days.find((d) => d.date === today) || days.filter((d) => d.date <= today).pop();
    if (!entry) return;
    const [year, month, day] = entry.date.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    horoscopeTitle.textContent = `Өнөөдрийн хувьд · ${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}, ${weekday} гараг`;
    horoscopeText.textContent = entry.text;
  } catch {
    // Ачаалагдахгүй бол HTML доторх текст хэвээр үлдэнэ
  }
};
loadHoroscope();

// Гарчгийг үсэг үсгээр гаргах (typewriter)
const typewrite = (element) => {
  let index = 0;
  const wrap = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      for (const char of node.textContent) {
        if (char.trim() === '') {
          fragment.appendChild(document.createTextNode(char));
          continue;
        }
        const span = document.createElement('span');
        span.className = 'char';
        span.style.setProperty('--i', index++);
        span.textContent = char;
        fragment.appendChild(span);
      }
      node.replaceWith(fragment);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
      [...node.childNodes].forEach(wrap);
    }
  };
  [...element.childNodes].forEach(wrap);
};
typewrite(welcomeTitle);

// Од, зүрх бууж унах
const random = (min, max) => min + Math.random() * (max - min);
const dropConfetti = () => {
  const symbols = ['✦', '✧', '★', '·'];
  const colors = ['#e9aa78', '#e86c88', '#f4b6c7', '#ffd166'];
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    piece.style.setProperty('--x', `${random(2, 98)}vw`);
    piece.style.setProperty('--s', `${random(12, 26)}px`);
    piece.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
    piece.style.setProperty('--d', `${random(1.8, 3.2)}s`);
    piece.style.setProperty('--r', `${random(-540, 540)}deg`);
    piece.style.animationDelay = `${random(0, 0.5)}s`;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
};

// Хуудас эргэж солигдох
let isFlipping = false;
const goToPage = (from, to, backward = false) => {
  if (isFlipping) return;
  isFlipping = true;
  card.classList.toggle('backward', backward);
  card.classList.add('flip-out');
  setTimeout(() => {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    card.classList.remove('flip-out');
    card.classList.add('flip-in');
    card.addEventListener('animationend', () => {
      card.classList.remove('flip-in', 'backward');
      isFlipping = false;
    }, { once: true });
  }, 320);
};

continueButton.addEventListener('click', () => {
  dropConfetti();
  goToPage(welcome, zodiac);
});
zodiacContinueButton.addEventListener('click', () => goToPage(zodiac, farewell));
zodiacBackButton.addEventListener('click', () => goToPage(zodiac, welcome, true));
farewellBackButton.addEventListener('click', () => goToPage(farewell, zodiac, true));

secretStar.addEventListener('click', () => {
  secretNote.classList.toggle('hidden');
});

// Зураг дээр дарахад 2 дахь зураг руу солигдоно
photoFrame.addEventListener('click', () => {
  photoFrame.classList.toggle('flipped');
});

// Дуу тоглох үед урсах нот, од
let noteTimer = null;
const spawnNote = () => {
  const symbols = ['♪', '♫', '✦', '✧'];
  const colors = ['#e9aa78', '#e86c88', '#f4b6c7'];
  const note = document.createElement('span');
  note.className = 'float-note';
  note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  note.style.setProperty('--x', `${random(8, 88)}%`);
  note.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
  note.style.setProperty('--s', `${random(14, 26)}px`);
  note.style.setProperty('--d', `${random(2.6, 4)}s`);
  note.style.setProperty('--dx', `${random(-40, 40)}px`);
  farewell.appendChild(note);
  note.addEventListener('animationend', () => note.remove());
};
const startNotes = () => {
  if (noteTimer) return;
  spawnNote();
  noteTimer = setInterval(spawnNote, 650);
};
const stopNotes = () => {
  clearInterval(noteTimer);
  noteTimer = null;
};

const formatTime = (seconds) => {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const setPlaying = (playing) => {
  isSongPlaying = playing;
  musicPlayer.classList.toggle('is-playing', playing);
  if (playing) startNotes(); else stopNotes();
  songStatus.textContent = playing ? 'одоо тоглож байна' : 'дарж тоглуулаарай';
};

const updateProgress = () => {
  if (!player || typeof player.getDuration !== 'function') return;
  const duration = player.getDuration();
  if (!duration) return;
  const current = player.getCurrentTime();
  progressBar.style.width = `${(current / duration) * 100}%`;
  songStatus.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
};

const stopProgress = () => {
  clearInterval(progressTimer);
  progressTimer = null;
};

// Видео ачаалагдахгүй бол (жишээ нь file://-оор нээсэн) YouTube-ийн алдааг ил гаргана
const showFallbackPlayer = () => {
  if (youtubePlayer.classList.contains('is-visible')) return;
  youtubePlayer.classList.add('is-visible');
  youtubePlayer.removeAttribute('aria-hidden');
  youtubePlayer.removeAttribute('tabindex');
  songStatus.textContent = 'дуу ачаалагдсангүй';
};

const playSong = () => {
  if (!hasStarted) {
    hasStarted = true;
    player.seekTo(SONG_START_SECONDS, true);
  }
  player.playVideo();
};

// YouTube IFrame API: дуу тоглох, зогсох төлөвийг custom карттай тааруулна
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('youtubePlayer', {
    events: {
      onReady: () => {
        playerReady = true;
        if (pendingPlay) {
          pendingPlay = false;
          playSong();
        }
      },
      onStateChange: ({ data }) => {
        if (data === YT.PlayerState.PLAYING) {
          setPlaying(true);
          stopProgress();
          progressTimer = setInterval(updateProgress, 500);
          updateProgress();
        } else if (data === YT.PlayerState.PAUSED) {
          setPlaying(false);
          stopProgress();
        } else if (data === YT.PlayerState.ENDED) {
          setPlaying(false);
          stopProgress();
          progressBar.style.width = '100%';
          finalNote.classList.remove('hidden');
        }
      },
      onError: showFallbackPlayer
    }
  });
};

const apiScript = document.createElement('script');
apiScript.src = 'https://www.youtube.com/iframe_api';
apiScript.onerror = () => {
  songStatus.textContent = 'YouTube ачаалагдсангүй (ad blocker?)';
};
document.head.appendChild(apiScript);
setTimeout(() => {
  if (!playerReady) songStatus.textContent = 'YouTube хариу өгсөнгүй (file:// эсвэл ad blocker?)';
}, 10000);

musicPlayer.addEventListener('click', () => {
  if (!playerReady) {
    // Тоглогч бэлэн болмогц автоматаар эхэлнэ
    pendingPlay = !pendingPlay;
    songStatus.textContent = pendingPlay ? 'ачаалж байна...' : 'дарж тоглуулаарай';
    musicPlayer.classList.toggle('is-playing', pendingPlay);
    return;
  }
  if (isSongPlaying) player.pauseVideo();
  else playSong();
});
