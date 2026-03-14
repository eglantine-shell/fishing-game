(function () {
  const app = document.getElementById("app");

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function resetState() {
    const level = window.levels[0];
    const [a, b] = level.overtimeThresholdRange;

    return {
      levelIndex: 0,
      levelId: level.id,
      quota: level.quota,
      used: 0,
      remaining: level.quota,
      overtimeClicks: 0,
      overtimeThreshold: randInt(a, b),
      warningCount: 0,
      finalHourWarning: false,
      logs: {
        actions: [],
        warnings: []
      },
      lastTagText: null,
      quitFrom: null
    };
  }

  let state = resetState();

  function setView(html) {
    app.innerHTML = html;
  }

  function renderStart() {
    setView(`
      <div class="view startView">
        <div class="card">
          <h1 class="h1">${escapeHtml(copy.start.title)}</h1>
          <p class="p">${escapeHtml(copy.start.intro).replaceAll("\\n","<br/>")}</p>
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
    state.levelId = level.id;
    state.quota = level.quota;

    setView(`
      <div class="view">
        <div class="card levelTop">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;">
            <div>
              <div class="h1" style="margin:0;">${escapeHtml(level.title)}</div>
              <div class="p">偷回配额：${level.quota} 点</div>
            </div>
            <div class="p" id="counterText">已用 ${state.used} / ${level.quota}</div>
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
      const pct = clamp((state.used / level.quota) * 100, 0, 100);
      progressBar.style.width = pct + "%";
      counterText.textContent = `已用 ${state.used} / ${level.quota}`;
      if (state.used > level.quota) progressBar.classList.add("danger");
      else progressBar.classList.remove("danger");
    }

    syncEndBtn();
    syncProgress();

    btnEnd.onclick = () => {
      if (state.remaining > 0) return;
      renderSummary();
    };

    const ids = level.tagPool.map(x => x.id);
    const chips = ids.map(id => window.tagsById[id]).filter(Boolean);

    requestAnimationFrame(() => {
      const positions = genNonOverlappingPositions(chips, tagArea, btnEnd);

      chips.forEach((tag, i) => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = tag.text;

        chip.style.left = positions[i].left + "px";
        chip.style.top = positions[i].top + "px";

        chip.onclick = () => {
          onTagClick(level, tag, hint, syncProgress, syncEndBtn);
        };

        tagArea.appendChild(chip);
      });
    });
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
    state.logs.warnings.push({
      t: Date.now(),
      levelId: level.id,
      warningTag: level.warningEvent.tag
    });

    const last = state.lastTagText ?? "这个";
    const body = `糟糕，坐过站了！${last}有这么好看吗！`;

    renderModal({
      title: "糟糕",
      body,
      okText: copy.modal.ok,
      quitText: copy.modal.quit,
      onOk: () => {
        closeModal();
        renderSummary();
      },
      onQuit: () => {
        closeModal();
        state.quitFrom = "modal";
        renderQuit();
      }
    });
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
    const m = document.getElementById("modalMask");
    if (m) m.remove();
  }

  function renderSummary() {
    const total = state.logs.actions.length;
    const warnings = state.logs.warnings.length;

    setView(`
      <div class="view">
        <div class="card">
          <h1 class="h1">${escapeHtml(copy.summary.title)}</h1>
          <p class="p">${escapeHtml(copy.summary.placeholder).replaceAll("\\n","<br/>")}</p>
        </div>

        <div class="card">
          <p class="p">今日偷回时间点：<b style="color:var(--text)">${total}</b></p>
          <p class="p">警告次数：<b style="color:var(--text)">${warnings}</b></p>
        </div>

        <div class="btnRow">
          <button class="btn primary" id="btnRestart">${escapeHtml(copy.summary.restart)}</button>
          <button class="btn" id="btnQuit">${escapeHtml(copy.summary.quit)}</button>
        </div>

        <div style="flex:1"></div>
        <p class="p" style="opacity:.7">M0：结算页先占位，后续会换成完整 SummaryView。</p>
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
          <p class="p">${escapeHtml(text).replaceAll("\\n","<br/>")}</p>
        </div>
        <div style="flex:1"></div>
        <p class="p" style="opacity:.7">（游戏已结束）</p>
      </div>
    `);
  }

  function estimateChipSize(text, tagAreaWidth) {
    const isMobile = window.innerWidth <= 640;
    const fontSize = isMobile ? 16.5 : 16.5;
    const padX = isMobile ? 18 : 18;
    const padY = isMobile ? 15 : 15;
    const border = 2;

    const charWidth = fontSize * 1.05;
    let width = Math.ceil(text.length * charWidth + padX * 2 + border * 2);
    const maxWidth = Math.floor(tagAreaWidth * (isMobile ? 0.6 : 0.42));
    width = Math.min(width, maxWidth);

    const height = Math.ceil(fontSize * 1.4 + padY * 2 + border * 2);

    return { width, height };
  }

  function rectsOverlap(a, b, gap = 12) {
    return !(
      a.x + a.width + gap < b.x ||
      b.x + b.width + gap < a.x ||
      a.y + a.height + gap < b.y ||
      b.y + b.height + gap < a.y
    );
  }

  function genNonOverlappingPositions(chips, tagArea, btnEnd) {
    const areaRect = tagArea.getBoundingClientRect();
    const areaWidth = areaRect.width;
    const areaHeight = areaRect.height;

    const endBtnRect = {
      width: btnEnd.offsetWidth || 136,
      height: btnEnd.offsetHeight || 48
    };

    const padding = 16;
    const reservedBottomRight = {
      x: areaWidth - endBtnRect.width - padding,
      y: areaHeight - endBtnRect.height - padding,
      width: endBtnRect.width,
      height: endBtnRect.height
    };

    const placed = [];

    const preferredZones = [
      { x1: 24, y1: 24, x2: areaWidth * 0.34, y2: areaHeight * 0.34 },
      { x1: areaWidth * 0.34, y1: 18, x2: areaWidth * 0.68, y2: areaHeight * 0.28 },
      { x1: areaWidth * 0.68, y1: 24, x2: areaWidth - 24, y2: areaHeight * 0.34 },

      { x1: 22, y1: areaHeight * 0.28, x2: areaWidth * 0.34, y2: areaHeight * 0.56 },
      { x1: areaWidth * 0.34, y1: areaHeight * 0.34, x2: areaWidth * 0.66, y2: areaHeight * 0.62 },
      { x1: areaWidth * 0.66, y1: areaHeight * 0.34, x2: areaWidth - 22, y2: areaHeight * 0.58 },

      { x1: 20, y1: areaHeight * 0.60, x2: areaWidth * 0.30, y2: areaHeight - 80 },
      { x1: areaWidth * 0.30, y1: areaHeight * 0.66, x2: areaWidth * 0.62, y2: areaHeight - 70 },
      { x1: areaWidth * 0.62, y1: areaHeight * 0.64, x2: areaWidth - endBtnRect.width - 40, y2: areaHeight - 80 }
    ];

    chips.forEach((tag, index) => {
      const size = estimateChipSize(tag.text, areaWidth);
      let placedRect = null;

      const zone = preferredZones[index % preferredZones.length];

      for (let attempt = 0; attempt < 80; attempt++) {
        const minX = Math.max(padding, zone.x1);
        const maxX = Math.min(zone.x2 - size.width, areaWidth - size.width - padding);
        const minY = Math.max(padding, zone.y1);
        const maxY = Math.min(zone.y2 - size.height, areaHeight - size.height - padding);

        const x = maxX > minX ? randInt(Math.floor(minX), Math.floor(maxX)) : minX;
        const y = maxY > minY ? randInt(Math.floor(minY), Math.floor(maxY)) : minY;

        const rect = { x, y, width: size.width, height: size.height };

        const overlapPlaced = placed.some(r => rectsOverlap(rect, r, 14));
        const overlapEndBtn = rectsOverlap(rect, reservedBottomRight, 18);

        if (!overlapPlaced && !overlapEndBtn) {
          placedRect = rect;
          break;
        }
      }

      if (!placedRect) {
        for (let attempt = 0; attempt < 120; attempt++) {
          const x = randInt(padding, Math.max(padding, areaWidth - size.width - padding));
          const y = randInt(padding, Math.max(padding, areaHeight - size.height - padding));
          const rect = { x, y, width: size.width, height: size.height };

          const overlapPlaced = placed.some(r => rectsOverlap(rect, r, 10));
          const overlapEndBtn = rectsOverlap(rect, reservedBottomRight, 18);

          if (!overlapPlaced && !overlapEndBtn) {
            placedRect = rect;
            break;
          }
        }
      }

      if (!placedRect) {
        placedRect = {
          x: padding + (index % 3) * (size.width + 18),
          y: padding + Math.floor(index / 3) * (size.height + 18),
          width: size.width,
          height: size.height
        };
      }

      placed.push(placedRect);
    });

    return placed.map(r => ({ left: r.x, top: r.y }));
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  renderStart();
})();