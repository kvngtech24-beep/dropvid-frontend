const API_BASE = "https://web-production-febd6.up.railway.app";

const grid = document.getElementById("urlGrid");
for (let i = 0; i < 10; i++) {
  const field = document.createElement("div");
  field.className = "url-field";
  field.innerHTML = `
    <span class="url-num">${i + 1}</span>
    <input class="url-input" id="url${i}" type="url" placeholder="https://..." />
  `;
  grid.appendChild(field);
}

function getUrls() {
  return Array.from({ length: 10 }, (_, i) =>
    document.getElementById(`url${i}`).value.trim()
  ).filter(Boolean);
}

function showError(msg) {
  const el = document.getElementById("errorBanner");
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}

function formatDuration(sec) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function fetchVideos() {
  const urls = getUrls();
  if (!urls.length) { showError("Paste at least one URL to continue."); return; }

  const btn = document.getElementById("fetchBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Fetching info...`;
  showError("");
  document.getElementById("results").innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch video info");
    renderResults(data.results);
    document.getElementById("clearBtn").style.display = "block";
  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg> Fetch Videos`;
  }
}

function renderResults(results) {
  const container = document.getElementById("results");
  const successful = results.filter(r => r.success).length;
  container.innerHTML = `<p class="results-heading">Results — ${successful} found</p>`;

  results.forEach((r, i) => {
    if (!r.success) {
      const card = document.createElement("div");
      card.className = "failed-card";
      card.innerHTML = `
        <span style="color:#f87171;font-size:20px">✕</span>
        <div>
          <p class="failed-url">${r.url}</p>
          <p class="failed-reason">${r.error || "Could not fetch this video"}</p>
        </div>`;
      container.appendChild(card);
      return;
    }

    const qualities = r.qualities && r.qualities.length ? r.qualities : ["720", "audio"];
    const qualityOptions = qualities
      .map(q => `<option value="${q}">${q === "audio" ? "Audio (MP3)" : `${q}p`}</option>`)
      .join("");

    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <div class="card-index">#${i + 1}</div>
      ${r.thumbnail ? `
        <div class="thumbnail-wrap">
          <img class="thumbnail" src="${r.thumbnail}" alt="${r.title}" />
          ${r.duration ? `<span class="duration">${formatDuration(r.duration)}</span>` : ""}
        </div>` : ""}
      <div class="card-info">
        <p class="platform-badge">${r.platform || ""}</p>
        <h3 class="video-title">${r.title}</h3>
        <div class="quality-row">
          <select class="quality-select" id="qualitySelect${i}">
            ${qualityOptions}
          </select>
          <button class="dl-btn" id="dlBtn${i}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 3v13M5 16l7 7 7-7"/><path d="M3 21h18"/>
            </svg>
            Download
          </button>
        </div>
        <p class="error-msg" id="dlError${i}"></p>
      </div>`;
    container.appendChild(card);

    document.getElementById(`dlBtn${i}`).addEventListener("click", () => downloadVideo(r.url, i));
  });
}

async function downloadVideo(url, index) {
  const btn = document.getElementById(`dlBtn${index}`);
  const errEl = document.getElementById(`dlError${index}`);
  const qualitySelect = document.getElementById(`qualitySelect${index}`);
  const quality = qualitySelect ? qualitySelect.value : "720";

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Downloading...`;
  errEl.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, quality }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Download failed");
    }

    const ext = quality === "audio" ? "mp3" : "mp4";
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `dropvid-${index + 1}.${ext}`;
    link.click();
    window.URL.revokeObjectURL(blobUrl);

  } catch (e) {
    errEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 3v13M5 16l7 7 7-7"/><path d="M3 21h18"/>
      </svg> Download`;
  }
}

function clearAll() {
  for (let i = 0; i < 10; i++) document.getElementById(`url${i}`).value = "";
  document.getElementById("results").innerHTML = "";
  document.getElementById("clearBtn").style.display = "none";
  showError("");
}
