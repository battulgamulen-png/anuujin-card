const welcome = document.querySelector('#welcome');
const continueButton = document.querySelector('#continueButton');
const zodiac = document.querySelector('#zodiac');
const zodiacContinueButton = document.querySelector('#zodiacContinueButton');
const zodiacBackButton = document.querySelector('#zodiacBackButton');
const farewell = document.querySelector('#farewell');
const farewellBackButton = document.querySelector('#farewellBackButton');
const farewellContinueButton = document.querySelector('#farewellContinueButton');
const weather = document.querySelector('#weather');
const weatherBackButton = document.querySelector('#weatherBackButton');
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

// Плейлист: YouTube ID, нэр, эхлэх секунд
const PLAYLIST = [
  { id: 'Uv4zZpWDr9c', title: 'A-Sound — Хэлээгүй ч…', start: 0 },
  { id: 'NXolApL1GIo', title: 'Becca — Comfy', start: 0 },
  { id: 'lbCA9D1X7to', title: 'Magnolian & NMN — Өөр хүмүүс', start: 0 },
  { id: 'v22ASLZ5o4M', title: 'luuya — Гаригийн өдөр', start: 0 },
];
let songIndex = 0;
const SONG_START_SECONDS = PLAYLIST[0].start;
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
// Текстийг өгүүлбэр бүрээр зөөлөн гаргана
const revealLines = (element, text) => {
  element.textContent = '';
  text.match(/[^.!?]+[.!?]*\s*/g).forEach((sentence, i) => {
    const span = document.createElement('span');
    span.className = 'line';
    span.style.setProperty('--i', i);
    span.textContent = sentence;
    element.appendChild(span);
  });
};
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
    revealLines(horoscopeText, entry.text);
    if (entry.advice) revealLines(document.querySelector('#starText'), entry.advice);
    if (entry.ratings) {
      const stars = (n) => '★'.repeat(n) + `<span class="off">${'★'.repeat(5 - n)}</span>`;
      document.querySelector('#ratingOverall').innerHTML = stars(entry.ratings.overall);
      document.querySelector('#ratingMood').innerHTML = stars(entry.ratings.mood);
      document.querySelector('#ratingSuccess').innerHTML = stars(entry.ratings.success);
      document.querySelector('#starRatings').classList.remove('hidden');
    }
    if (entry.lucky) {
      document.querySelector('#luckyNumber').textContent = entry.lucky.number;
      document.querySelector('#luckyColor').textContent = entry.lucky.color;
      document.querySelector('#luckyDot').style.setProperty('--lucky', entry.lucky.hex);
      document.querySelector('#lucky').classList.remove('hidden');
    }
  } catch {
    // Ачаалагдахгүй бол HTML доторх текст хэвээр үлдэнэ
  }
};
loadHoroscope();

// Далиан хотын цаг агаар (Open-Meteo, түлхүүр шаардахгүй)
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=38.9140&longitude=121.6147'
  + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day'
  + '&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset'
  + '&timezone=Asia%2FShanghai&forecast_days=4';
const UB_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=47.9184&longitude=106.9177'
  + '&current=temperature_2m,weather_code&timezone=Asia%2FUlaanbaatar';
const WEATHER_CODES = [
  [[0], 'Цэлмэг', '☀︎', 'sun'],
  [[1], 'Ихэвчлэн цэлмэг', '☀︎', 'sun'],
  [[2], 'Үүлэрхэг', '⛅︎', 'clouds'],
  [[3], 'Бүрхэг', '☁︎', 'clouds'],
  [[45, 48], 'Манантай', '≋', 'fog'],
  [[51, 53, 55, 56, 57], 'Шиврээ бороо', '☂︎', 'rain'],
  [[61, 63, 65, 66, 67], 'Бороотой', '☂︎', 'rain'],
  [[71, 73, 75, 77], 'Цастай', '❄︎', 'snow'],
  [[80, 81, 82], 'Аадар бороо', '☂︎', 'rain'],
  [[85, 86], 'Цасан шуурга', '❄︎', 'snow'],
  [[95, 96, 99], 'Аянга цахилгаантай', '⚡︎', 'rain'],
];
const describeWeather = (code) => {
  const found = WEATHER_CODES.find(([codes]) => codes.includes(code));
  return found ? { text: found[1], icon: found[2], sky: found[3] } : { text: 'Тодорхойгүй', icon: '☁︎', sky: 'clouds' };
};
const weatherTip = (code, temp) => {
  if (code >= 95) return 'Аянга цахилгаантай байна, гэртээ дулаахан байгаарай ⚡';
  if (code >= 71 && code <= 86) return 'Цас орж байна, дулаан хувцаслаад болгоомжтой яваарай ❄';
  if (code >= 51) return 'Бороотой байна, шүхрээ мартуузай ☂';
  if (temp <= 5) return 'Их хүйтэн байна, дулаан хувцаслаарай';
  if (temp <= 15) return 'Сэрүүхэн байна, хүрмээ авч гараарай';
  if (temp >= 28) return 'Халуун байна, ус ихээр уугаарай';
  return 'Гадаа гоё байна, гараад жаахан алхаарай ✦';
};
// Хувцасны зөвлөгөө: температур, нөхцөлөөс хамаарна
const outfitFor = (code, temp, wind) => {
  const items = [];
  if (temp <= 0) items.push('Дулаан куртка', 'Ороолт', 'Малгай, бээлий');
  else if (temp <= 10) items.push('Куртка', 'Зузаан цамц', 'Ороолт');
  else if (temp <= 17) items.push('Хүрэм', 'Урт ханцуйтай цамц');
  else if (temp <= 24) items.push('Хөнгөн хүрэм', 'Футболк');
  else items.push('Хөнгөн хувцас', 'Нарны шил');
  if (code >= 51 && code <= 67 || code >= 80) items.push('Шүхэр ☂');
  if (code >= 71 && code <= 86) items.push('Гулгахгүй гутал');
  if (wind >= 30) items.push('Салхинаас хамгаалах хүрэм');
  return items.slice(0, 4);
};

// Нөхцөлөөс хамаарсан амьд дэвсгэр
const weatherSky = document.querySelector('#weatherSky');
const makeParticles = (className, count, make) => {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = className;
    make(el, i);
    weatherSky.appendChild(el);
  }
};
const paintSky = (sky, isDay) => {
  weatherSky.textContent = '';
  weather.classList.toggle('is-night', !isDay);
  if (!isDay) {
    const moon = document.createElement('div');
    moon.className = 'moon';
    weatherSky.appendChild(moon);
    makeParticles('night-star', 14, (el) => {
      el.textContent = Math.random() > 0.5 ? '✦' : '✧';
      el.style.setProperty('--x', `${random(2, 96)}%`);
      el.style.setProperty('--y', `${random(2, 60)}%`);
      el.style.setProperty('--s', `${random(9, 18)}px`);
      el.style.setProperty('--delay', `${random(0, 2.5)}s`);
    });
  } else if (sky === 'sun') {
    const sun = document.createElement('div');
    sun.className = 'sun';
    const rays = document.createElement('div');
    rays.className = 'rays';
    weatherSky.append(sun, rays);
  }
  if (sky === 'clouds' || sky === 'rain' || sky === 'snow') {
    makeParticles('cloud', sky === 'clouds' ? 3 : 2, (el, i) => {
      el.style.setProperty('--y', `${[3, 14, 26][i]}%`);
      el.style.setProperty('--d', `${[52, 70, 62][i]}s`);
      el.style.setProperty('--delay', `${[-10, -35, -50][i]}s`);
      el.style.transform = `scale(${[1, .7, .85][i]})`;
    });
  }
  if (sky === 'rain') {
    makeParticles('drop', 36, (el) => {
      el.style.setProperty('--x', `${random(0, 100)}%`);
      el.style.setProperty('--d', `${random(0.9, 1.6)}s`);
      el.style.setProperty('--delay', `${random(-2, 0)}s`);
    });
  }
  if (sky === 'snow') {
    makeParticles('flake', 26, (el) => {
      el.textContent = '❄';
      el.style.setProperty('--x', `${random(0, 100)}%`);
      el.style.setProperty('--s', `${random(8, 16)}px`);
      el.style.setProperty('--d', `${random(6, 11)}s`);
      el.style.setProperty('--delay', `${random(-10, 0)}s`);
    });
  }
  if (sky === 'fog') {
    makeParticles('fog', 4, (el, i) => {
      el.style.setProperty('--y', `${12 + i * 22}%`);
      el.style.setProperty('--d', `${6 + i * 2}s`);
    });
  }
};

// Температур 0-оос тоолж гарч ирнэ
const weatherTemp = document.querySelector('#weatherTemp');
let targetTemp = null;
let tempShown = false;
const renderTemp = (value) => {
  weatherTemp.innerHTML = `${Math.round(value)}<span class="deg">°</span>`;
};
const animateTemp = () => {
  if (targetTemp === null) return;
  const start = performance.now();
  const duration = 1100;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    renderTemp(targetTemp * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const showWeatherPage = () => {
  tempShown = true;
  animateTemp();
};

const loadWeather = async () => {
  try {
    const [dalianRes, ubRes] = await Promise.all([fetch(WEATHER_URL), fetch(UB_WEATHER_URL).catch(() => null)]);
    if (!dalianRes.ok) throw new Error(dalianRes.status);
    const { current, hourly, daily } = await dalianRes.json();
    const now = describeWeather(current.weather_code);
    document.querySelector('#weatherIcon').textContent = current.is_day ? now.icon : '☾';
    targetTemp = current.temperature_2m;
    if (tempShown) animateTemp(); else renderTemp(targetTemp);
    document.querySelector('#weatherDesc').textContent = now.text;
    document.querySelector('#weatherFeels').textContent = `Мэдрэгдэх: ${Math.round(current.apparent_temperature)}°`;
    document.querySelector('#weatherTime').textContent = `${current.time.slice(11, 16)}, Далианы цагаар`;
    document.querySelector('#weatherRange').textContent = `${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°`;
    document.querySelector('#weatherWind').textContent = `${Math.round(current.wind_speed_10m)} км/ц`;
    document.querySelector('#weatherHumidity').textContent = `${current.relative_humidity_2m}%`;
    document.querySelector('#weatherSun').textContent = `↑ ${daily.sunrise[0].slice(11, 16)}  ↓ ${daily.sunset[0].slice(11, 16)}`;
    document.querySelector('#weatherTip').textContent = weatherTip(current.weather_code, current.temperature_2m);
    paintSky(now.sky, current.is_day === 1);

    const outfit = document.querySelector('#weatherOutfit');
    outfit.textContent = '';
    outfitFor(current.weather_code, current.temperature_2m, current.wind_speed_10m).forEach((item) => {
      const chip = document.createElement('span');
      chip.textContent = item;
      outfit.appendChild(chip);
    });

    // Ойрын 8 цаг
    const hours = document.querySelector('#weatherHours');
    hours.textContent = '';
    const startIndex = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
    hourly.time.slice(startIndex, startIndex + 8).forEach((time, i) => {
      const info = describeWeather(hourly.weather_code[startIndex + i]);
      const cell = document.createElement('div');
      cell.innerHTML = `<span class="hour-time">${i === 0 ? 'Одоо' : time.slice(11, 16)}</span>`
        + `<span class="hour-icon">${info.icon}</span><strong>${Math.round(hourly.temperature_2m[startIndex + i])}°</strong>`;
      hours.appendChild(cell);
    });

    const days = document.querySelector('#weatherDays');
    days.textContent = '';
    daily.time.slice(1).forEach((date, i) => {
      const [y, m, d] = date.split('-').map(Number);
      const info = describeWeather(daily.weather_code[i + 1]);
      const card = document.createElement('div');
      card.innerHTML = `<span class="day-name">${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}</span>`
        + `<span class="day-icon">${info.icon}</span>${Math.round(daily.temperature_2m_max[i + 1])}° / ${Math.round(daily.temperature_2m_min[i + 1])}°`;
      days.appendChild(card);
    });

    // Улаанбаатартай харьцуулах
    if (ubRes && ubRes.ok) {
      const ub = (await ubRes.json()).current;
      const diff = Math.round(current.temperature_2m - ub.temperature_2m);
      const compare = diff > 0 ? `Далианд ${diff}° дулаан байна` : diff < 0 ? `Улаанбаатарт ${-diff}° дулаан байна` : 'хоёр хотод адилхан байна';
      document.querySelector('#weatherCompare').innerHTML = `Улаанбаатарт одоо <strong>${Math.round(ub.temperature_2m)}°</strong>, ${describeWeather(ub.weather_code).text.toLowerCase()} · ${compare}`;
    }
  } catch {
    document.querySelector('#weatherDesc').textContent = 'Цаг агаар татаж чадсангүй';
    document.querySelector('#weatherTime').textContent = 'дахин оролдоорой';
  }
};
loadWeather();

// Гарчгийг үсэг үсгээр гаргах (typewriter)
const typewrite = (element) => {
  let index = 0;
  const wrap = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      // Үг бүрийг нэг блок болгож, мөр зөвхөн үгийн завсраар таслагдана
      for (const part of node.textContent.split(/(\s+)/)) {
        if (part.trim() === '') {
          if (part) fragment.appendChild(document.createTextNode(part));
          continue;
        }
        const word = document.createElement('span');
        word.className = 'word';
        for (const char of part) {
          const span = document.createElement('span');
          span.className = 'char';
          span.style.setProperty('--i', index++);
          span.textContent = char;
          word.appendChild(span);
        }
        fragment.appendChild(word);
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
farewellContinueButton.addEventListener('click', () => {
  goToPage(farewell, weather);
  setTimeout(showWeatherPage, 340);
});
weatherBackButton.addEventListener('click', () => goToPage(weather, farewell, true));

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
  card.classList.toggle('music-on', playing);
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
    player.seekTo(PLAYLIST[songIndex].start, true);
  }
  player.playVideo();
};

// Дуу солих
const songTitle = document.querySelector('#songTitle');
const playlistIndex = document.querySelector('#playlistIndex');
const changeSong = (step) => {
  songIndex = (songIndex + step + PLAYLIST.length) % PLAYLIST.length;
  const song = PLAYLIST[songIndex];
  songTitle.textContent = song.title;
  playlistIndex.textContent = `${songIndex + 1} / ${PLAYLIST.length}`;
  progressBar.style.width = '0';
  hasStarted = true;
  if (!playerReady) {
    youtubePlayer.src = `https://www.youtube.com/embed/${song.id}?enablejsapi=1&playsinline=1&rel=0&start=${song.start}`;
    return;
  }
  if (isSongPlaying) player.loadVideoById({ videoId: song.id, startSeconds: song.start });
  else {
    player.cueVideoById({ videoId: song.id, startSeconds: song.start });
    songStatus.textContent = 'дарж тоглуулаарай';
  }
};
document.querySelector('#prevSong').addEventListener('click', () => changeSong(-1));
document.querySelector('#nextSong').addEventListener('click', () => changeSong(1));

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
