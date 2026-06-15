let allWords = vocabularyData || [];
let words = [...allWords];
let currentIndex = 0;
let currentAudio = null;
let currentMode = "study";

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value || "";
}

function getCurrentWord() {
  return words[currentIndex];
}

function langInfo(lang) {
  const w = getCurrentWord();

  if (lang === "ja") return { word: w.jp, read: w.kana, ex: w.example_ja, langCode: "ja-JP", tag: "JA" };
  if (lang === "en") return { word: w.en, read: w.ipa, ex: w.example_en, langCode: "en-US", tag: "EN" };
  if (lang === "cn") return { word: w.cn, read: w.pinyin, ex: w.example_cn, langCode: "zh-CN", tag: "CN" };
  if (lang === "ko") return { word: w.ko, read: w.koread, ex: w.example_ko, langCode: "ko-KR", tag: "KO" };

  return { word: w.jp, read: w.kana, ex: w.example_ja, langCode: "ja-JP", tag: "JA" };
}

function showWord() {
  if (!words.length) return;

  const w = getCurrentWord();
  const lang = $("langSelect") ? $("langSelect").value : "ja";
  const main = langInfo(lang);

  setText("counter", `${currentIndex + 1} / ${words.length}`);
  setText("todayProgress", `${currentIndex + 1} / ${words.length} từ`);

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

  const progress = ((currentIndex + 1) / words.length) * 100;
  if ($("progressFill")) $("progressFill").style.width = progress + "%";
  if ($("audioRange")) $("audioRange").value = progress;
}

function nextWord() {
  currentIndex++;
  if (currentIndex >= words.length) currentIndex = 0;
  showWord();
}

function prevWord() {
  currentIndex--;
  if (currentIndex < 0) currentIndex = words.length - 1;
  showWord();
}

function speakText(text, langCode) {
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
    words = allWords.filter(w => {
      const c = (w.category || "").toLowerCase();
      return c.includes(category);
    });
  }

  currentIndex = 0;

  if (!words.length) {
    words = [...allWords];
    currentIndex = 0;
  }

  showWord();
}

function switchToStudy() {
  currentMode = "study";
  $("studyMode").classList.remove("hidden");
  $("listenMode").classList.add("hidden");
  $("modeStudy").classList.add("active");
  $("modeListen").classList.remove("active");
}

function switchToListen() {
  currentMode = "listen";
  $("studyMode").classList.add("hidden");
  $("listenMode").classList.remove("hidden");
  $("modeStudy").classList.remove("active");
  $("modeListen").classList.add("active");
  showWord();
}

document.addEventListener("DOMContentLoaded", function () {
  if (!words || words.length === 0) {
    alert("Không có dữ liệu từ vựng");
    return;
  }

  showWord();

  $("nextBtn").addEventListener("click", nextWord);
  $("prevBtn").addEventListener("click", prevWord);

  $("speakMain").addEventListener("click", speakMainWord);
  $("bigPlay").addEventListener("click", playBigListen);
$("pauseBtn").addEventListener("click", function () {
  if (isAutoListening) {
    stopAutoListen();
    $("pauseBtn").textContent = "▶";
  } else {
    startAutoListen();
    $("pauseBtn").textContent = "Ⅱ";
  }
});

$("autoToggle").addEventListener("change", function () {
  if (this.checked) {
    startAutoListen();
    $("pauseBtn").textContent = "Ⅱ";
  } else {
    stopAutoListen();
    $("pauseBtn").textContent = "▶";
  }
});

  $("langSelect").addEventListener("change", showWord);
  $("categorySelect").addEventListener("change", filterWords);

  $("modeStudy").addEventListener("click", switchToStudy);
  $("modeListen").addEventListener("click", switchToListen);
  $("bottomModeBtn").addEventListener("click", switchToListen);
  let autoListenTimer = null;
let isAutoListening = false;

function autoListenOneWord() {
  const lang = $("langSelect") ? $("langSelect").value : "ja";
  const info = langInfo(lang);

  showWord();
  setText("playingText", "Đang nghe tự động...");

  speakText(info.word, info.langCode);

  autoListenTimer = setTimeout(function () {
    speakText(info.ex, info.langCode);

    autoListenTimer = setTimeout(function () {
      nextWord();

      if (isAutoListening) {
        autoListenOneWord();
      }
    }, 3500);
  }, 2200);
}

function startAutoListen() {
  isAutoListening = true;
  autoListenOneWord();
  setText("playingText", "Đang nghe tự động...");
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

  setText("playingText", "Đã tạm dừng");
}
});