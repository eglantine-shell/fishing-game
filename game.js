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
          <div class="endBtnWrap">
            <button class="btn primary" id="btnEnd">${escapeHtml(level.endText)}</button>
          </div>
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

    placeChipsInGrid(tagArea, chips, (tag) => {
      onTagClick(level, tag, hint, syncProgress, syncEndBtn);
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

  function placeChipsInGrid(container, chips, onClick) {
    const cellW = window.innerWidth <= 640 ? 150 : 180;
    const cellH = window.innerWidth <= 640 ? 90 : 100;

    const startX = 18;
    const startY = 18;

    const containerWidth = container.clientWidth;
    const bottomReserved = window.innerWidth <= 640 ? 100 : 110;

    const usableWidth = containerWidth - startX * 2;
    const cols = Math.max(2, Math.floor(usableWidth / cellW));

    chips.forEach((tag, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = tag.text;

      const left = startX + col * cellW;
      const top = startY + row * cellH;

      chip.style.left = `${left}px`;
      chip.style.top = `${top}px`;

      chip.onclick = () => onClick(tag);

      container.appendChild(chip);
    });

    const rows = Math.ceil(chips.length / cols);
    const neededHeight = startY + rows * cellH + bottomReserved;
    const minHeight = window.innerWidth <= 640 ? 380 : 420;
    container.style.minHeight = `${Math.max(minHeight, neededHeight)}px`;
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