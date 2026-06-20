let allWords = vocabularyData || [];
let words = [...allWords];
let currentIndex = 0;
let currentAudio = null;
let currentMode = "study";
let currentListenPlan = "fun";
let autoListenTimer = null;
let isAutoListening = false;

const todayKey = "learned_" + new Date().toISOString().slice(0, 10);

const appStateKey = "vocab_app_state_v3";
const learnedByLangKey = "vocab_learned_by_lang_v3";

const langConfigs = {
  ja: {
    label: "Nhật - Việt",
    wordKey: "jp",
    readKey: "kana",
    exKey: "example_ja",
    idKey: "JP_ID",
    tag: "JA",
    css: "ja",
    langCode: "ja-JP",
    levels: [
      { value: "1", label: "N1" },
      { value: "2", label: "N2" },
      { value: "3", label: "N3" },
      { value: "4", label: "N4" },
      { value: "5", label: "N5" }
    ]
  },
  en: {
    label: "Anh - Việt",
    wordKey: "en",
    readKey: "ipa",
    exKey: "example_en",
    idKey: "EN_ID",
    tag: "EN",
    css: "en",
    langCode: "en-US",
    levels: [
      { value: "1", label: "A1" },
      { value: "2", label: "A2" },
      { value: "3", label: "B1" },
      { value: "4", label: "B2" },
      { value: "5", label: "C1" },
      { value: "6", label: "C2" }
    ]
  },
  cn: {
    label: "Trung - Việt",
    wordKey: "cn",
    readKey: "pinyin",
    exKey: "example_cn",
    idKey: "CN_ID",
    tag: "CN",
    css: "cn",
    langCode: "zh-CN",
    levels: [
      { value: "1", label: "HSK1" },
      { value: "2", label: "HSK2" },
      { value: "3", label: "HSK3" },
      { value: "4", label: "HSK4" },
      { value: "5", label: "HSK5" },
      { value: "6", label: "HSK6" }
    ]
  },
  ko: {
    label: "Hàn - Việt",
    wordKey: "ko",
    readKey: "koread",
    exKey: "example_ko",
    idKey: "KO_ID",
    tag: "KO",
    css: "ko",
    langCode: "ko-KR",
    levels: [
      { value: "1", label: "TOPIK1" },
      { value: "2", label: "TOPIK2" },
      { value: "3", label: "TOPIK3" },
      { value: "4", label: "TOPIK4" },
      { value: "5", label: "TOPIK5" },
      { value: "6", label: "TOPIK6" }
    ]
  }
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


function normalizeText(value) {
  return String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function getSavedState() {
  try {
    return JSON.parse(localStorage.getItem(appStateKey)) || {};
  } catch (e) {
    return {};
  }
}

function saveAppState() {
  try {
    const categorySelect = $("categorySelect");
    const langSelect = $("langSelect");

    localStorage.setItem(appStateKey, JSON.stringify({
      index: currentIndex,
      mode: currentMode,
      listenPlan: currentListenPlan,
      lang: langSelect ? langSelect.value : "ja",
      category: categorySelect ? categorySelect.value : "all"
    }));
  } catch (e) {}
}

function restoreAppStateBeforeFilter() {
  const state = getSavedState();

  if (state.lang && $("langSelect")) $("langSelect").value = state.lang;
  if (state.mode) currentMode = state.mode;
  if (state.listenPlan) currentListenPlan = state.listenPlan;
  if (Number.isFinite(Number(state.index))) currentIndex = Number(state.index);
}

function restoreCategoryAfterSetup() {
  const state = getSavedState();
  const select = $("categorySelect");
  if (!select || !state.category) return;

  const values = [...select.options].map(op => op.value);
  if (values.includes(state.category)) select.value = state.category;
}

function getLearnedByLang() {
  try {
    return JSON.parse(localStorage.getItem(learnedByLangKey)) || {};
  } catch (e) {
    return {};
  }
}

function saveLearnedByLang(lang, wordId) {
  if (!lang || !wordId) return;

  const learned = getLearnedByLang();
  if (!learned[lang]) learned[lang] = [];

  if (!learned[lang].includes(wordId)) {
    learned[lang].push(wordId);
    localStorage.setItem(learnedByLangKey, JSON.stringify(learned));
  }
}

function getLangLearnedCount(lang) {
  const learned = getLearnedByLang();
  return learned[lang] ? learned[lang].length : 0;
}

function showStudyStats() {
  const msg =
    "📊 Thống kê học tập trên máy này\n\n" +
    "🇯🇵 Tiếng Nhật: " + getLangLearnedCount("ja") + " từ\n" +
    "🇬🇧 Tiếng Anh: " + getLangLearnedCount("en") + " từ\n" +
    "🇨🇳 Tiếng Trung: " + getLangLearnedCount("cn") + " từ\n" +
    "🇰🇷 Tiếng Hàn: " + getLangLearnedCount("ko") + " từ\n\n" +
    "Dữ liệu này được lưu trên thiết bị đang học.";

  alert(msg);
}

function findVocabularyMatch(keyword) {
  const q = normalizeText(keyword);
  if (!q) return null;

  const searchFields = [
    { lang: "vi", keys: ["vn", "vietnamese", "example_vi"] },
    { lang: "ja", keys: ["jp", "kana", "example_ja"] },
    { lang: "en", keys: ["en", "ipa", "example_en"] },
    { lang: "cn", keys: ["cn", "pinyin", "example_cn"] },
    { lang: "ko", keys: ["ko", "koread", "example_ko"] }
  ];

  for (const w of allWords) {
    for (const group of searchFields) {
      for (const key of group.keys) {
        if (normalizeText(w[key]) === q) {
          return { word: w, lang: group.lang === "vi" ? getSelectedLang() : group.lang };
        }
      }
    }
  }

  // Không tìm gần đúng để tránh nhầm từ.
  // Ví dụ: tìm "life" mà dữ liệu chưa có thì không được nhảy sang "love".
  return null;
}

function searchVocabulary() {
  const keyword = prompt("🔍 Nhập từ cần tìm\nCó thể nhập Việt / Nhật / Kana / Anh / Trung / Pinyin / Hàn:");

  if (keyword === null) return;

  const result = findVocabularyMatch(keyword);

  if (!result) {
    alert("📚 Từ này hiện chưa có trong bản lần này.\n✨ Bản sau sẽ cập nhật thêm nhé!");
    return;
  }

  stopAutoListen();

  if (result.lang && langConfigs[result.lang] && $("langSelect")) {
    $("langSelect").value = result.lang;
  }

  currentMode = "study";
  setupCategorySelect();

  const categorySelect = $("categorySelect");
  if (categorySelect) categorySelect.value = "all";

  words = [...allWords];

  const foundIndex = words.findIndex(w => getWordId(w) === getWordId(result.word));
  currentIndex = foundIndex >= 0 ? foundIndex : 0;

  $("studyMode")?.classList.remove("hidden");
  $("listenMode")?.classList.add("hidden");
  $("modeStudy")?.classList.add("active");
  $("modeListen")?.classList.remove("active");

  showWord();
}

function setupSearchButton() {
  ["searchBtn", "searchButton", "btnSearch", "searchIcon"].forEach(id => {
    safeAdd(id, "click", searchVocabulary);
  });

  document.querySelectorAll("button").forEach(btn => {
    const text = (btn.textContent || "").trim();
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
    const title = (btn.getAttribute("title") || "").toLowerCase();

    if (
      text.includes("🔍") ||
      text.includes("⌕") ||
      aria.includes("search") ||
      aria.includes("tìm") ||
      title.includes("search") ||
      title.includes("tìm")
    ) {
      btn.addEventListener("click", searchVocabulary);
    }
  });
}

function setupStatsButton() {
  ["statsBtn", "statBtn", "statisticsBtn", "thongKeBtn"].forEach(id => {
    safeAdd(id, "click", showStudyStats);
  });

  document.querySelectorAll("button").forEach(btn => {
    const text = (btn.textContent || "").trim().toLowerCase();
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
    const title = (btn.getAttribute("title") || "").toLowerCase();

    if (
      text.includes("thống kê") ||
      aria.includes("thống kê") ||
      title.includes("thống kê") ||
      aria.includes("statistics") ||
      title.includes("statistics")
    ) {
      btn.addEventListener("click", showStudyStats);
    }
  });
}

function getSelectedLang() {
  const langSelect = $("langSelect");
  return langSelect ? langSelect.value : "ja";
}

function getLangConfig(lang) {
  return langConfigs[lang] || langConfigs.ja;
}

function getCurrentWord() {
  return words[currentIndex];
}

function getWordId(w) {
  if (!w) return "";
  return w.id || `${w.jp}_${w.en}_${w.cn}_${w.ko}_${w.vn}`;
}

function getLevelId(w, lang) {
  const cfg = getLangConfig(lang);
  const raw = w ? w[cfg.idKey] : 100;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 100;
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

  saveLearnedByLang(getSelectedLang(), wordId);
}

function updateTodayProgress() {
  const learned = getTodayLearned();
  const done = words.filter(w => learned.includes(getWordId(w))).length;
  const total = words.length;
  const percent = total > 0 ? (done / total) * 100 : 0;

  setText("todayProgress", `${done} / ${total} từ`);
  if ($("progressFill")) $("progressFill").style.width = percent + "%";
}

function setupLangSelect() {
  const select = $("langSelect");
  if (!select) return;

  const oldValue = select.value || "ja";
  select.innerHTML = "";

  Object.keys(langConfigs).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = langConfigs[key].label;
    select.appendChild(option);
  });

  select.value = langConfigs[oldValue] ? oldValue : "ja";
}

function setupCategorySelect() {
  const select = $("categorySelect");
  if (!select) return;

  const oldValue = select.value || "all";
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

  const values = [...select.options].map(op => op.value);
  select.value = values.includes(oldValue) ? oldValue : "all";
}

function setupLevelSelect() {
  const select = $("categorySelect");
  if (!select) return;

  const lang = getSelectedLang();
  const cfg = getLangConfig(lang);
  const oldValue = select.value || "all";

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = `Tất cả (${allWords.length})`;
  select.appendChild(allOption);

  cfg.levels.forEach(level => {
    const count = allWords.filter(w => getLevelId(w, lang) === Number(level.value)).length;
    const option = document.createElement("option");
    option.value = level.value;
    option.textContent = `${level.label} (${count})`;
    select.appendChild(option);
  });

  const unclearCount = allWords.filter(w => getLevelId(w, lang) === 100).length;
  const unclearOption = document.createElement("option");
  unclearOption.value = "100";
  unclearOption.textContent = `Tất cả khác (${unclearCount})`;
  select.appendChild(unclearOption);

  const values = [...select.options].map(op => op.value);
  select.value = values.includes(oldValue) ? oldValue : "all";
}

function langInfo(lang) {
  const w = getCurrentWord();
  const cfg = getLangConfig(lang);

  if (!w) {
    return { word: "", read: "", ex: "", tag: cfg.tag, css: cfg.css, langCode: cfg.langCode };
  }

  return {
    word: w[cfg.wordKey] || "",
    read: w[cfg.readKey] || "",
    ex: w[cfg.exKey] || "",
    tag: cfg.tag,
    css: cfg.css,
    langCode: cfg.langCode
  };
}

function updateListenTag(info) {
  const tag = $("listenLangTag");
  if (!tag) return;
  tag.textContent = info.tag;
  tag.className = `tag ${info.css}`;
}

function showEmpty() {
  setText("counter", "0 / 0");
  setText("mainWord", "Không có dữ liệu");
  setText("mainRead", "");
  setText("vn", "");
  setText("ja", "");
  setText("kana", "");
  setText("en", "");
  setText("ipa", "");
  setText("cn", "");
  setText("pinyin", "");
  setText("ko", "");
  setText("koRead", "");
  setText("exVi", "");
  setText("exJa", "");
  setText("exEn", "");
  setText("exCn", "");
  setText("exKo", "");
  setText("listenCounter", "0 / 0");
  setText("listenWord", "Không có dữ liệu");
  setText("listenRead", "");
  setText("listenExampleText", "");
  setText("audioText", "Từ 0 / 0");
  updateTodayProgress();
}

function showWord() {
  if (!words.length) {
    showEmpty();
    return;
  }

  if (currentIndex >= words.length) currentIndex = 0;
  if (currentIndex < 0) currentIndex = 0;

  const w = getCurrentWord();
  const lang = getSelectedLang();
  const main = langInfo(lang);
  const langLabel = getLangConfig(lang).label;

  setText("counter", `${currentIndex + 1} / ${words.length}`);
  setText("mainWord", main.word);
  setText("mainRead", main.read);

  setText("vn", w.vn || "");
  setText("ja", w.jp || "");
  setText("kana", w.kana || "");
  setText("en", w.en || "");
  setText("ipa", w.ipa || "");
  setText("cn", w.cn || "");
  setText("pinyin", w.pinyin || "");
  setText("ko", w.ko || "");
  setText("koRead", w.koread || "");

  setText("exVi", w.example_vi || "");
  setText("exJa", w.example_ja || "");
  setText("exEn", w.example_en || "");
  setText("exCn", w.example_cn || "");
  setText("exKo", w.example_ko || "");

  setText("listenCounter", `${currentIndex + 1} / ${words.length}`);
  setText("listenWord", main.word);
  setText("listenRead", main.read);
  setText("listenExampleText", main.ex);
  setText("audioText", `Từ ${currentIndex + 1} / ${words.length}`);
  setText("listenPlanTitle", `🔊 Chế độ nghe tự động · ${langLabel}`);
  updateListenTag(main);

  if ($("audioRange")) {
    $("audioRange").value = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;
  }

  updateTodayProgress();
  saveAppState();
}

function nextWord() {
  if (!words.length) return;
  saveTodayLearned();
  currentIndex = (currentIndex + 1) % words.length;
  showWord();
}

function prevWord() {
  if (!words.length) return;
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
  const backupIndex = currentIndex;
  const info = langInfo(lang);
  currentIndex = backupIndex;
  speakText(info.word, info.langCode);
}

function speakExample(lang) {
  const backupIndex = currentIndex;
  const info = langInfo(lang);
  currentIndex = backupIndex;
  speakText(info.ex, info.langCode);
}

function speakMainWord() {
  const lang = getSelectedLang();
  const info = langInfo(lang);
  speakText(info.word, info.langCode);
}

function playBigListen() {
  const lang = getSelectedLang();
  const info = langInfo(lang);
  const w = getCurrentWord();
  if (!w) return;

  setText("playingText", "Đang phát...");
  playAudioFile(w.audio_word, info.word, info.langCode);
}

function filterWords() {
  const select = $("categorySelect");
  const selected = select ? select.value : "all";

  if (currentMode === "listen") {
    const lang = getSelectedLang();

    if (selected === "all") {
      words = [...allWords];
    } else {
      const levelId = Number(selected);
      words = allWords.filter(w => getLevelId(w, lang) === levelId);
    }
  } else {
    if (selected === "all") {
      words = [...allWords];
    } else {
      words = allWords.filter(w => w.category === selected);
    }
  }

  if (currentIndex >= words.length) currentIndex = 0;
  if (currentIndex < 0) currentIndex = 0;
  showWord();
}

function hideListenChoices() {
  const panel = $("listenChoicePanel");
  if (panel) panel.classList.add("hidden");
}

function showListenChoices() {
  switchToListen();
}

function switchToStudy() {
  currentMode = "study";
  stopAutoListen();
  hideListenChoices();

  setupCategorySelect();
  filterWords();

  $("studyMode")?.classList.remove("hidden");
  $("listenMode")?.classList.add("hidden");

  $("modeStudy")?.classList.add("active");
  $("modeListen")?.classList.remove("active");
}

function switchToListen(plan) {
  currentMode = "listen";
  if (plan) currentListenPlan = plan;
  hideListenChoices();

  setupLevelSelect();
  filterWords();

  $("studyMode")?.classList.add("hidden");
  $("listenMode")?.classList.remove("hidden");

  $("modeStudy")?.classList.remove("active");
  $("modeListen")?.classList.add("active");
}

function autoListenOneWord() {
  if (!isAutoListening || !words.length) return;

  const lang = getSelectedLang();
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

function adjustTopLayoutLikeMockup() {
  const filters = document.querySelector(".filters");
  const modeSwitch = document.querySelector(".modeSwitch");

  if (filters && modeSwitch && filters.previousElementSibling !== modeSwitch) {
    filters.parentNode.insertBefore(modeSwitch, filters);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (!words || words.length === 0) {
    alert("Không có dữ liệu từ vựng");
    return;
  }

  adjustTopLayoutLikeMockup();
  setupLangSelect();
  restoreAppStateBeforeFilter();
  setupCategorySelect();
  restoreCategoryAfterSetup();
  filterWords();
  setupSearchButton();
  setupStatsButton();

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
    if (currentMode === "listen") {
      setupLevelSelect();
    }
    currentIndex = 0;
    filterWords();
    saveAppState();
    if (currentMode === "listen") setText("playingText", "Đã đổi ngôn ngữ nghe");
  });

  safeAdd("categorySelect", "change", function () {
    currentIndex = 0;
    filterWords();
    saveAppState();
    if (currentMode === "listen") setText("playingText", "Đã đổi cấp độ nghe");
  });

  safeAdd("modeStudy", "click", switchToStudy);
  safeAdd("modeListen", "click", function () {
    switchToListen();
  });
  safeAdd("bottomModeBtn", "click", function () {
    switchToListen();
  });

  safeAdd("back15", "click", prevWord);
  safeAdd("next15", "click", nextWord);

  safeAdd("audioRange", "input", function () {
    if (!words.length) return;
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
