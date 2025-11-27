// UI elements
const explainBtn = document.getElementById("explainBtn");
const codeInput = document.getElementById("codeInput");
const languageSelect = document.getElementById("language");
const output = document.getElementById("output");
const detectedBadge = document.getElementById("detectedBadge");
const detectedLabel = document.getElementById("detectedLabel");
const themeToggle = document.getElementById("themeToggle");

// Theme: load preference
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️ Light Mode";
}
updateHighlightTheme();

// Event listeners
explainBtn.addEventListener("click", explainCode);
themeToggle.addEventListener("click", toggleTheme);

async function explainCode() {
  const code = codeInput.value || "";
  const language = languageSelect.value || "auto";

  if (!code.trim()) {
    output.innerHTML = '<div class="muted">Please paste some code first.</div>';
    return;
  }

  explainBtn.disabled = true;
  explainBtn.textContent = "Explaining…";
  output.innerHTML = '<div class="muted">Generating explanation — this can take a few seconds...</div>';
  detectedBadge.style.display = "none";
  detectedLabel.textContent = "";

  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
    });

    const data = await res.json();

    if (data.error) {
      output.innerHTML = `<div class="muted">Error: ${escapeHtml(data.error)}</div>`;
      return;
    }

    const raw = data.explanation || "";
    const firstLineMatch = raw.split(/\r?\n/)[0].match(/^Detected-Language:\s*(.+)\s*$/i);
    let cleaned = raw;

    if (firstLineMatch) {
      const detected = firstLineMatch[1].trim();
      detectedLabel.textContent = `Detected: ${detected}`;
      detectedBadge.style.display = "block";
      cleaned = raw.split(/\r?\n/).slice(1).join("\n").trim();
    } else {
      if (language !== "auto") {
        detectedLabel.textContent = `Language: ${language}`;
        detectedBadge.style.display = "block";
      } else {
        detectedBadge.style.display = "none";
      }
    }

    const md = cleaned || "_No explanation returned._";
    output.innerHTML = marked.parse(md);

    document.querySelectorAll("pre code").forEach((el) => {
      try { hljs.highlightElement(el); } catch (e) {}
    });

  } catch (err) {
    console.error(err);
    output.innerHTML = `<div class="muted">Request failed: ${escapeHtml(err.message || err)}</div>`;
  } finally {
    explainBtn.disabled = false;
    explainBtn.textContent = "Explain";
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* THEME FUNCTIONS */
function toggleTheme() {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  themeToggle.textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", dark ? "dark" : "light");
  updateHighlightTheme();
}

function updateHighlightTheme() {
  const isDark = document.body.classList.contains("dark");
  const hlDark = document.getElementById("hl-dark");
  const hlLight = document.getElementById("hl-light");
  if (hlDark && hlLight) {
    hlDark.disabled = !isDark;
    hlLight.disabled = isDark;
  }
}
