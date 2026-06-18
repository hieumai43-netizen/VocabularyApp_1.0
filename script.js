let allWords = vocabularyData || [];
let words = [...allWords];
let currentIndex = 0;
let currentAudio = null;
let currentMode = "study";
let currentListenPlan = "fun";

let autoListenTimer = null;
let isAutoListening = false;

const todayKey = "learned_" + new Date().toISOString().slice(0, 10);

const listenPlans = {
  fun: "Học vui vẻ",
  n5: "N5 gợi ý",
  n4: "N4 gợi ý",
  n3: "N3 gợi ý"
};

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value || "";
}

function safeAdd(id, eventName, fn) {
  const el = $(id);
  if (el) el.addEventListener(eventName, fn);
}

function getCurrentWord() {
  return words[currentIndex];
}

function getWordId(w) {
  return w.id || `${w.jp}_${w.en}_${w.cn}_${w.ko}_${w.vn}`;
}

function getTodayLearned() {
  try {
    return JSON.parse(localStorage.getItem(todayKey)) || [];
  } catch (e) {
    return [];
  }
}

function saveTodayLearned() {
  const w = getCurrentWord();
  if (!w) return;

  const wordId = getWordId(w);
  let learned = getTodayLearned();

  if (!learned.includes(wordId)) {
    learned.push(wordId);
    localStorage.setItem(todayKey, JSON.stringify(learned));
  }
}

function updateTodayProgress() {
  const learned = getTodayLearned();
  const done = words.filter(w => learned.includes(getWordId(w))).length;
  const total = words.length;
  const percent = total > 0 ? (done / total) * 100 : 0;

  setText("todayProgress", `${done} / ${total} từ`);

  if ($("progressFill")) {
    $("progressFill").style.width = percent + "%";
  }
}

function setupCategorySelect() {
  const select = $("categorySelect");
  if (!select) return;

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = `Tất cả (${allWords.length})`;
  select.appendChild(allOption);

  const categories = [...new Set(allWords.map(w => w.category).filter(Boolean))];

  categories.forEach(cat => {
    const count = allWords.filter(w => w.category === cat).length;
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = `${cat} (${count})`;
    select.appendChild(option);
  });
}

function langInfo(lang) {
  const w = getCurrentWord();
  if (!w) return { word: "", read: "", ex: "", tag: "JA", css: "ja", langCode: "ja-JP" };

  if (lang === "en") {
    return { word: w.en, read: w.ipa, ex: w.example_en, tag: "EN", css: "en", langCode: "en-US" };
  }

  if (lang === "cn") {
    return { word: w.cn, read: w.pinyin, ex: w.example_cn, tag: "CN", css: "cn", langCode: "zh-CN" };
  }

  if (lang === "ko") {
    return { word: w.ko, read: w.koread, ex: w.example_ko, tag: "KO", css: "ko", langCode: "ko-KR" };
  }

  return { word: w.jp, read: w.kana, ex: w.example_ja, tag: "JA", css: "ja", langCode: "ja-JP" };
}

function updateListenTag(info) {
  const tag = $("listenLangTag");
  if (!tag) return;
  tag.textContent = info.tag;
  tag.className = `tag ${info.css}`;
}

function showWord() {
  if (!words.length) return;

  const w = getCurrentWord();
  const lang = $("langSelect") ? $("langSelect").value : "ja";
  const main = langInfo(lang);

  setText("counter", `${currentIndex + 1} / ${words.length}`);
  setText("mainWord", main.word);
  setText("mainRead", main.read);

  setText("vn", w.vn);
  setText("ja", w.jp);
  setText("kana", w.kana);
  setText("en", w.en);
  setText("ipa", w.ipa);
  setText("cn", w.cn);
  setText("pinyin", w.pinyin);
  setText("ko", w.ko);
  setText("koRead", w.koread);

  setText("exVi", w.example_vi);
  setText("exJa", w.example_ja);
  setText("exEn", w.example_en);
  setText("exCn", w.example_cn);
  setText("exKo", w.example_ko);

  setText("listenCounter", `${currentIndex + 1} / ${words.length}`);
  setText("listenWord", main.word);
  setText("listenRead", main.read);
  setText("listenExampleText", main.ex);
  setText("audioText", `Từ ${currentIndex + 1} / ${words.length}`);
  setText("listenPlanTitle", `🔊 ${listenPlans[currentListenPlan]} · ${main.tag} - Việt`);
  updateListenTag(main);

  if ($("audioRange")) {
    $("audioRange").value = ((currentIndex + 1) / words.length) * 100;
  }

  updateTodayProgress();
}

function nextWord() {
  saveTodayLearned();
  currentIndex = (currentIndex + 1) % words.length;
  showWord();
}

function prevWord() {
  currentIndex = (currentIndex - 1 + words.length) % words.length;
  showWord();
}

function speakText(text, langCode, onEnd) {
  if (!text) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = 0.85;
  utter.pitch = 1;
  utter.onend = function () {
    if (typeof onEnd === "function") onEnd();
  };

  speechSynthesis.speak(utter);
}

function playAudioFile(path, fallbackText, langCode) {
  if (!path) {
    speakText(fallbackText, langCode);
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  speechSynthesis.cancel();
  currentAudio = new Audio(path);

  currentAudio.onerror = function () {
    speakText(fallbackText, langCode);
  };

  currentAudio.play().catch(function () {
    speakText(fallbackText, langCode);
  });
}

function speak(lang) {
  const info = langInfo(lang);
  speakText(info.word, info.langCode);
}

function speakExample(lang) {
  const info = langInfo(lang);
  speakText(info.ex, info.langCode);
}

function speakMainWord() {
  const lang = $("langSelect") ? $("langSelect").value : "ja";
  const info = langInfo(lang);
  speakText(info.word, info.langCode);
}

function playBigListen() {
  const lang = $("langSelect") ? $("langSelect").value : "ja";
  const info = langInfo(lang);
  const w = getCurrentWord();

  setText("playingText", "Đang phát...");
  playAudioFile(w.audio_word, info.word, info.langCode);
}

function filterWords() {
  const category = $("categorySelect").value;

  if (category === "all") {
    words = [...allWords];
  } else {
    words = allWords.filter(w => w.category === category);
  }

  currentIndex = 0;
  showWord();
}

function hideListenChoices() {
  const panel = $("listenChoicePanel");
  if (panel) panel.classList.add("hidden");
}

function showListenChoices() {
  const panel = $("listenChoicePanel");
  if (panel) panel.classList.toggle("hidden");
}

function switchToStudy() {
  currentMode = "study";
  stopAutoListen();
  hideListenChoices();

  $("studyMode").classList.remove("hidden");
  $("listenMode").classList.add("hidden");
  $("modeStudy").classList.add("active");
  $("modeListen").classList.remove("active");
}

function switchToListen(plan) {
  currentMode = "listen";
  if (plan) currentListenPlan = plan;
  hideListenChoices();

  $("studyMode").classList.add("hidden");
  $("listenMode").classList.remove("hidden");
  $("modeStudy").classList.remove("active");
  $("modeListen").classList.add("active");

  showWord();
}

function autoListenOneWord() {
  if (!isAutoListening || !words.length) return;

  const lang = $("langSelect") ? $("langSelect").value : "ja";
  const info = langInfo(lang);

  showWord();
  setText("playingText", "Đang nghe tự động...");

  speakText(info.word, info.langCode);

  autoListenTimer = setTimeout(function () {
    speakText(info.ex, info.langCode);

    autoListenTimer = setTimeout(function () {
      saveTodayLearned();
      currentIndex = (currentIndex + 1) % words.length;
      showWord();

      if (isAutoListening) autoListenOneWord();
    }, 3500);
  }, 2200);
}

function startAutoListen() {
  if (isAutoListening) return;
  isAutoListening = true;
  setText("playingText", "Đang nghe tự động...");
  if ($("autoToggle")) $("autoToggle").checked = true;
  if ($("pauseBtn")) $("pauseBtn").textContent = "Ⅱ";
  autoListenOneWord();
}

function stopAutoListen() {
  isAutoListening = false;

  if (autoListenTimer) {
    clearTimeout(autoListenTimer);
    autoListenTimer = null;
  }

  speechSynthesis.cancel();

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if ($("autoToggle")) $("autoToggle").checked = false;
  if ($("pauseBtn")) $("pauseBtn").textContent = "▶";
  setText("playingText", "Đã tạm dừng");
}

function chooseListenPlan(plan) {
  currentListenPlan = plan || "fun";

  document.querySelectorAll(".listenChoice").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.plan === currentListenPlan);
  });

  switchToListen(currentListenPlan);
}

document.addEventListener("DOMContentLoaded", function () {
  if (!words || words.length === 0) {
    alert("Không có dữ liệu từ vựng");
    return;
  }

  setupCategorySelect();
  showWord();

  safeAdd("nextBtn", "click", nextWord);
  safeAdd("prevBtn", "click", prevWord);
  safeAdd("speakMain", "click", speakMainWord);
  safeAdd("bigPlay", "click", playBigListen);

  safeAdd("pauseBtn", "click", function () {
    if (isAutoListening) stopAutoListen();
    else startAutoListen();
  });

  safeAdd("autoToggle", "change", function () {
    if (this.checked) startAutoListen();
    else stopAutoListen();
  });

  safeAdd("langSelect", "change", function () {
    showWord();
    if (currentMode === "listen") setText("playingText", "Đã đổi ngôn ngữ nghe");
  });

  safeAdd("categorySelect", "change", function () {
    filterWords();
    if (currentMode === "listen") setText("playingText", "Đã đổi danh mục nghe");
  });

  safeAdd("modeStudy", "click", switchToStudy);
  safeAdd("modeListen", "click", showListenChoices);
  safeAdd("bottomModeBtn", "click", showListenChoices);

  safeAdd("back15", "click", prevWord);
  safeAdd("next15", "click", nextWord);

  safeAdd("audioRange", "input", function () {
    const nextIndex = Math.max(0, Math.min(words.length - 1, Math.round((Number(this.value) / 100) * (words.length - 1))));
    currentIndex = nextIndex;
    showWord();
  });

  document.querySelectorAll(".listenChoice").forEach(btn => {
    btn.addEventListener("click", function () {
      chooseListenPlan(this.dataset.plan);
    });
  });
});
