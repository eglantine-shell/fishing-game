(function () {
  const app = document.getElementById("app");

  // ---------- util ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setView(html) {
    app.innerHTML = html;
  }

  function fillTemplate(template, vars = {}) {
    let out = template || "";
    Object.entries(vars).forEach(([key, value]) => {
      out = out.replaceAll(`{${key}}`, value ?? "");
    });
    return out;
  }

  // ---------- state ----------
  function getLevelQuota(level, logs) {
    if (level.id === "company" && typeof level.quotaIfPrevWarning === "number") {
      const metroWarned = logs.warnings.some(w => w.levelId === "metro");
      return metroWarned ? level.quotaIfPrevWarning : level.quota;
    }
    return level.quota;
  }

  function makeLevelRuntime(level, logs) {
    const [a, b] = level.overtimeThresholdRange;
    return {
      levelIndex: window.levels.findIndex(l => l.id === level.id),
      levelId: level.id,
      quota: getLevelQuota(level, logs),
      used: 0,
      remaining: getLevelQuota(level, logs),
      overtimeClicks: 0,
      overtimeThreshold: randInt(a, b)
    };
  }

  function resetState() {
    const firstLevel = window.levels[0];
    const logs = {
      actions: [],
      warnings: []
    };
    return {
      ...makeLevelRuntime(firstLevel, logs),
      warningCount: 0,
      finalHourWarning: false,
      logs,
      lastTagText: null,
      quitFrom: null,
      endingKey: null
    };
  }

  let state = resetState();

  function enterLevel(levelIndex) {
    const level = window.levels[levelIndex];
    const runtime = makeLevelRuntime(level, state.logs);

    state.levelIndex = levelIndex;
    state.levelId = runtime.levelId;
    state.quota = runtime.quota;
    state.used = runtime.used;
    state.remaining = runtime.remaining;
    state.overtimeClicks = runtime.overtimeClicks;
    state.overtimeThreshold = runtime.overtimeThreshold;
  }

  // ---------- views ----------
  function renderStart() {
    setView(`
      <div class="view startView">
        <div class="card">
          <h1 class="h1">${escapeHtml(copy.start.title)}</h1>
          <p class="p">${escapeHtml(copy.start.intro).replaceAll("\\n", "<br/>")}</p>
        </div>
        <button class="btn primary" id="btnStart">${escapeHtml(copy.start.cta)}</button>
      </div>
    `);

    document.getElementById("btnStart").onclick = () => {
      state = resetState();
      renderLevel();
    };
  }

  function renderLevel() {
    const level = window.levels[state.levelIndex];

    setView(`
      <div class="view">
        <div class="card levelTop">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;">
            <div>
              <div class="h1" style="margin:0;">${escapeHtml(level.title)}</div>
              <div class="p">偷回配额：${state.quota} 点</div>
            </div>
            <div class="p" id="counterText">已用 ${state.used} / ${state.quota}</div>
          </div>

          <div class="progressWrap" aria-label="progress">
            <div class="progressBar" id="progressBar"></div>
          </div>
        </div>

        <div class="tagArea" id="tagArea">
          <button class="btn primary tagAreaEndBtn" id="btnEnd">${escapeHtml(level.endText)}</button>
        </div>

        <div class="card hint" id="hint">
          点击标签，偷回一点点时间。
        </div>
      </div>
    `);

    const tagArea = document.getElementById("tagArea");
    const hint = document.getElementById("hint");
    const progressBar = document.getElementById("progressBar");
    const counterText = document.getElementById("counterText");
    const btnEnd = document.getElementById("btnEnd");

    function syncEndBtn() {
      if (state.remaining === 0) btnEnd.classList.add("show");
      else btnEnd.classList.remove("show");
    }

    function syncProgress() {
      const pct = clamp((state.used / state.quota) * 100, 0, 100);
      progressBar.style.width = pct + "%";
      counterText.textContent = `已用 ${state.used} / ${state.quota}`;
      if (state.used > state.quota) progressBar.classList.add("danger");
      else progressBar.classList.remove("danger");
    }

    syncEndBtn();
    syncProgress();

    btnEnd.onclick = () => {
      if (state.remaining > 0) return;
      goNext();
    };

    const tags = level.tagPool
      .map(item => window.tagsById[item.id])
      .filter(Boolean);

    requestAnimationFrame(() => {
      const placements = layoutTags(tags, tagArea, btnEnd);

      placements.forEach(({ tag, x, y }) => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = tag.text;
        chip.style.left = `${x}px`;
        chip.style.top = `${y}px`;

        chip.onclick = () => {
          onTagClick(level, tag, hint, syncProgress, syncEndBtn);
        };

        tagArea.appendChild(chip);
      });
    });
  }

  function renderSummary() {
    const total = state.logs.actions.length;
    const warningCount = state.logs.warnings.length;
    const actionsByLevel = {};

    window.levels.forEach(level => {
      actionsByLevel[level.id] = 0;
    });

    state.logs.actions.forEach(action => {
      actionsByLevel[action.levelId] = (actionsByLevel[action.levelId] || 0) + 1;
    });

    const ending = copy.endings[state.endingKey];

    setView(`
      <div class="view">
        <div class="card">
          <h1 class="h1">${escapeHtml(ending.title)}</h1>
          <p class="p">${escapeHtml(ending.body).replaceAll("\\n", "<br/>")}</p>
        </div>

        <div class="card">
          <p class="p">今日偷回时间点：<b style="color:var(--text)">${total}</b></p>
          <p class="p">警告次数：<b style="color:var(--text)">${warningCount}</b></p>
        </div>

        <div class="card">
          <p class="p">今日偷闲分布：</p>
          <div style="height:8px"></div>
          ${window.levels.map(level => `
            <p class="p">${escapeHtml(level.title)}：<b style="color:var(--text)">${actionsByLevel[level.id] || 0}</b></p>
          `).join("")}
        </div>

        <div class="card">
          <p class="p">警告统计：</p>
          <div style="height:8px"></div>
          ${
            state.logs.warnings.length === 0
              ? `<p class="p">今天风平浪静。公司暂时没有注意到你。</p>`
              : state.logs.warnings.map(item => {
                  const level = window.levels.find(l => l.id === item.levelId);
                  return `<p class="p">${escapeHtml(level ? level.title : item.levelId)}：${escapeHtml(item.warningTag)}</p>`;
                }).join("")
          }
        </div>

        <div class="btnRow">
          <button class="btn primary" id="btnRestart">${escapeHtml(copy.summary.restart)}</button>
          <button class="btn" id="btnQuit">${escapeHtml(copy.summary.quit)}</button>
        </div>
      </div>
    `);

    document.getElementById("btnRestart").onclick = () => renderStart();
    document.getElementById("btnQuit").onclick = () => {
      state.quitFrom = "summary";
      renderQuit();
    };
  }

  function renderQuit() {
    const text = state.quitFrom === "modal" ? copy.quit.early : copy.quit.after;

    setView(`
      <div class="view">
        <div class="card">
          <h1 class="h1">辞职</h1>
          <p class="p">${escapeHtml(text).replaceAll("\\n", "<br/>")}</p>
        </div>
        <div style="flex:1"></div>
        <p class="p" style="opacity:.7">（游戏已结束）</p>
      </div>
    `);
  }

  function renderModal({ title, body, okText, quitText, onOk, onQuit }) {
    const mask = document.createElement("div");
    mask.className = "modalMask";
    mask.id = "modalMask";
    mask.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modalTitle">${escapeHtml(title)}</h3>
        <p class="modalBody">${escapeHtml(body)}</p>
        <div class="btnRow" style="justify-content:flex-end">
          <button class="btn" id="btnQuit">${escapeHtml(quitText)}</button>
          <button class="btn primary" id="btnOk">${escapeHtml(okText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);

    document.getElementById("btnOk").onclick = onOk;
    document.getElementById("btnQuit").onclick = onQuit;
  }

  function closeModal() {
    const modal = document.getElementById("modalMask");
    if (modal) modal.remove();
  }

  // ---------- gameplay ----------
  function goNext() {
    if (state.levelIndex < window.levels.length - 1) {
      enterLevel(state.levelIndex + 1);
      renderLevel();
    } else {
      decideEnding();
      renderSummary();
    }
  }

  function decideEnding() {
    if (state.warningCount >= 4 && state.finalHourWarning === false) {
      state.endingKey = "ending1";
    } else if (state.warningCount >= 2 && state.finalHourWarning === false) {
      state.endingKey = "ending2";
    } else {
      state.endingKey = "ending3";
    }
  }

  function onTagClick(level, tag, hintEl, syncProgress, syncEndBtn) {
    state.used += 1;

    if (state.remaining > 0) {
      state.remaining -= 1;
    } else {
      state.overtimeClicks += 1;
    }

    state.lastTagText = tag.text;

    state.logs.actions.push({
      t: Date.now(),
      levelId: state.levelId,
      tagId: tag.id,
      tagText: tag.text
    });

    hintEl.textContent = tag.feedback;

    syncProgress();
    syncEndBtn();

    if (state.remaining === 0 && state.overtimeClicks >= state.overtimeThreshold) {
      triggerWarning(level);
    }
  }

  function triggerWarning(level) {
    state.warningCount += 1;

    if (level.id === "lastHour") {
      state.finalHourWarning = true;
    }

    state.logs.warnings.push({
      t: Date.now(),
      levelId: level.id,
      warningTag: level.warningEvent.tag
    });

    const body = fillTemplate(level.warningEvent.bodyTemplate, {
      lastTag: state.lastTagText ?? "这个"
    });

    renderModal({
      title: level.warningEvent.title || "糟糕",
      body,
      okText: level.warningEvent.okText || "知道了",
      quitText: level.warningEvent.quitText || "要不辞职？",
      onOk: () => {
        closeModal();
        goNext();
      },
      onQuit: () => {
        closeModal();
        state.quitFrom = "modal";
        renderQuit();
      }
    });
  }

  // ---------- layout ----------
  function rectsOverlap(a, b, gap = 12) {
    return !(
      a.x + a.width + gap <= b.x ||
      b.x + b.width + gap <= a.x ||
      a.y + a.height + gap <= b.y ||
      b.y + b.height + gap <= a.y
    );
  }

  function measureChip(tagText, tagArea) {
    const temp = document.createElement("button");
    temp.className = "chip";
    temp.textContent = tagText;
    temp.style.visibility = "hidden";
    temp.style.left = "-9999px";
    temp.style.top = "-9999px";

    tagArea.appendChild(temp);
    const rect = temp.getBoundingClientRect();
    temp.remove();

    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height)
    };
  }

  function layoutTags(tags, tagArea, btnEnd) {
    const areaRect = tagArea.getBoundingClientRect();
    const areaWidth = Math.floor(areaRect.width);
    const areaHeight = Math.floor(areaRect.height);

    const isMobile = window.innerWidth <= 640;
    const padding = isMobile ? 14 : 18;
    const gap = isMobile ? 10 : 14;

    const btnWidth = btnEnd.offsetWidth || 140;
    const btnHeight = btnEnd.offsetHeight || 52;

    const reserved = {
      x: areaWidth - btnWidth - padding,
      y: areaHeight - btnHeight - padding,
      width: btnWidth,
      height: btnHeight
    };

    const measured = tags.map(tag => ({
      tag,
      ...measureChip(tag.text, tagArea)
    }));

    measured.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    const placed = [];
    const bands = [
      { y1: padding, y2: Math.floor(areaHeight * 0.30) },
      { y1: Math.floor(areaHeight * 0.30), y2: Math.floor(areaHeight * 0.62) },
      { y1: Math.floor(areaHeight * 0.62), y2: areaHeight - padding }
    ];

    for (let i = 0; i < measured.length; i++) {
      const item = measured[i];
      let found = null;

      const preferredBand = i % 3;
      const tryBands = [
        bands[preferredBand],
        bands[(preferredBand + 1) % 3],
        bands[(preferredBand + 2) % 3]
      ];

      for (const band of tryBands) {
        const minX = padding;
        const maxX = areaWidth - item.width - padding;
        const minY = band.y1;
        const maxY = band.y2 - item.height;

        if (maxX <= minX || maxY <= minY) continue;

        for (let attempt = 0; attempt < 220; attempt++) {
          const x = randInt(minX, maxX);
          const y = randInt(minY, maxY);

          const rect = { x, y, width: item.width, height: item.height };

          const hitPlaced = placed.some(r => rectsOverlap(rect, r, gap));
          const hitReserved = rectsOverlap(rect, reserved, gap + 6);

          if (!hitPlaced && !hitReserved) {
            found = rect;
            break;
          }
        }

        if (found) break;
      }

      if (!found) {
        outer:
        for (let y = padding; y <= areaHeight - item.height - padding; y += 8) {
          for (let x = padding; x <= areaWidth - item.width - padding; x += 8) {
            const rect = { x, y, width: item.width, height: item.height };
            const hitPlaced = placed.some(r => rectsOverlap(rect, r, gap));
            const hitReserved = rectsOverlap(rect, reserved, gap + 6);

            if (!hitPlaced && !hitReserved) {
              found = rect;
              break outer;
            }
          }
        }
      }

      if (!found) {
        outer2:
        for (let y = padding; y <= areaHeight - item.height - padding; y += 6) {
          for (let x = padding; x <= areaWidth - item.width - padding; x += 6) {
            const rect = { x, y, width: item.width, height: item.height };
            const hitPlaced = placed.some(r => rectsOverlap(rect, r, 4));
            const hitReserved = rectsOverlap(rect, reserved, 8);

            if (!hitPlaced && !hitReserved) {
              found = rect;
              break outer2;
            }
          }
        }
      }

      if (!found) {
        found = {
          x: padding,
          y: padding + i * (item.height + 6),
          width: item.width,
          height: item.height
        };
      }

      placed.push({
        ...found,
        tag: item.tag
      });
    }

    return tags.map(tag => {
      const match = placed.find(p => p.tag.id === tag.id);
      return {
        tag,
        x: match.x,
        y: match.y
      };
    });
  }

  // ---------- boot ----------
  renderStart();
})();