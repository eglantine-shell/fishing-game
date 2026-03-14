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
      const positions = layoutChipsWithRealMeasure(chips, tagArea, btnEnd);

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
    temp.style.left = "-9999px";
    temp.style.top = "-9999px";
    temp.style.visibility = "hidden";

    tagArea.appendChild(temp);
    const rect = temp.getBoundingClientRect();
    temp.remove();

    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height)
    };
  }

  function layoutChipsWithRealMeasure(tags, tagArea, btnEnd) {
    const areaRect = tagArea.getBoundingClientRect();
    const areaWidth = Math.floor(areaRect.width);
    const areaHeight = Math.floor(areaRect.height);

    const padding = window.innerWidth <= 640 ? 14 : 16;
    const gap = window.innerWidth <= 640 ? 10 : 14;

    const endBtnRect = {
      width: btnEnd.offsetWidth || 140,
      height: btnEnd.offsetHeight || 52
    };

    // 给右下角结束按钮预留安全区
    const reservedEndBtn = {
      x: areaWidth - endBtnRect.width - padding,
      y: areaHeight - endBtnRect.height - padding,
      width: endBtnRect.width,
      height: endBtnRect.height
    };

    // 上中下三层，保持“不规则”但更稳
    const bands = [
      { y1: padding, y2: Math.floor(areaHeight * 0.28) },
      { y1: Math.floor(areaHeight * 0.28), y2: Math.floor(areaHeight * 0.62) },
      { y1: Math.floor(areaHeight * 0.62), y2: areaHeight - padding }
    ];

    // 先真实测量每个标签
    const measured = tags.map(tag => ({
      tag,
      ...measureChip(tag.text, tagArea)
    }));

    // 宽的先排，避免最后塞不下
    measured.sort((a, b) => b.width - a.width);

    const placed = [];

    for (let i = 0; i < measured.length; i++) {
      const item = measured[i];
      let placedRect = null;

      // 每个标签优先尝试某一层，但会随机偏一点
      const preferredBandIndex = i % 3;
      const bandOrder = [
        bands[preferredBandIndex],
        bands[(preferredBandIndex + 1) % 3],
        bands[(preferredBandIndex + 2) % 3]
      ];

      for (const band of bandOrder) {
        // 该层可用区域太小就跳过
        if (band.y2 - band.y1 < item.height + 8) continue;

        for (let attempt = 0; attempt < 120; attempt++) {
          const xMin = padding;
          const xMax = areaWidth - item.width - padding;
          const yMin = band.y1;
          const yMax = band.y2 - item.height;

          if (xMax <= xMin || yMax <= yMin) continue;

          const x = randInt(xMin, xMax);
          const y = randInt(yMin, yMax);

          const rect = {
            x,
            y,
            width: item.width,
            height: item.height
          };

          const hitPlaced = placed.some(p => rectsOverlap(rect, p, gap));
          const hitEndBtn = rectsOverlap(rect, reservedEndBtn, gap + 6);

          if (!hitPlaced && !hitEndBtn) {
            placedRect = rect;
            break;
          }
        }

        if (placedRect) break;
      }

      // 如果随机很多次还放不下，就做“扫描式兜底”
      if (!placedRect) {
        outer:
        for (let y = padding; y <= areaHeight - item.height - padding; y += 8) {
          for (let x = padding; x <= areaWidth - item.width - padding; x += 8) {
            const rect = {
              x,
              y,
              width: item.width,
              height: item.height
            };

            const hitPlaced = placed.some(p => rectsOverlap(rect, p, gap));
            const hitEndBtn = rectsOverlap(rect, reservedEndBtn, gap + 6);

            if (!hitPlaced && !hitEndBtn) {
              placedRect = rect;
              break outer;
            }
          }
        }
      }

      // 仍然放不下的话，最后极限兜底：缩短间距
      if (!placedRect) {
        outer2:
        for (let y = padding; y <= areaHeight - item.height - padding; y += 6) {
          for (let x = padding; x <= areaWidth - item.width - padding; x += 6) {
            const rect = {
              x,
              y,
              width: item.width,
              height: item.height
            };

            const hitPlaced = placed.some(p => rectsOverlap(rect, p, 4));
            const hitEndBtn = rectsOverlap(rect, reservedEndBtn, 8);

            if (!hitPlaced && !hitEndBtn) {
              placedRect = rect;
              break outer2;
            }
          }
        }
      }

      if (!placedRect) {
        // 理论上已经很难走到这里
        placedRect = {
          x: padding,
          y: padding + i * (item.height + 4),
          width: item.width,
          height: item.height
        };
      }

      placed.push({
        ...placedRect,
        tag: item.tag
      });
    }

    // 恢复成原 tag 顺序输出，避免文案和位置错乱
    return tags.map(tag => placed.find(p => p.tag.id === tag.id));
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