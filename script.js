const sampleCsv = `月,利用者数
1月,420
2月,560
3月,510
4月,720
5月,860
6月,930
7月,1080`;

const fontFamily =
  '"Gen Interface JP", Inter, "Noto Sans JP", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif';
const fontImports = [
  "https://cdn.jsdelivr.net/npm/gen-interface-jp@0.1.5/400.css",
  "https://cdn.jsdelivr.net/npm/gen-interface-jp@0.1.5/500.css",
  "https://cdn.jsdelivr.net/npm/gen-interface-jp@0.1.5/700.css",
];

const state = {
  csv: sampleCsv,
  chartType: "bar",
  size: "1920x1080",
  title: "月別利用者数の推移",
  subtitle: "発表資料にそのまま貼れる、静かなチャート図版。",
  source: "出典: サンプルデータ",
  accent: "#111113",
  background: "#ffffff",
  titleSize: 64,
  subtitleSize: 30,
  labelSize: 28,
  titleAlign: "left",
  density: "standard",
};

const els = {
  csvInput: document.querySelector("#csvInput"),
  chartType: document.querySelector("#chartType"),
  canvasRatio: document.querySelector("#canvasRatio"),
  titleInput: document.querySelector("#titleInput"),
  subtitleInput: document.querySelector("#subtitleInput"),
  sourceInput: document.querySelector("#sourceInput"),
  accentInput: document.querySelector("#accentInput"),
  backgroundInput: document.querySelector("#backgroundInput"),
  titleSizeInput: document.querySelector("#titleSizeInput"),
  subtitleSizeInput: document.querySelector("#subtitleSizeInput"),
  labelSizeInput: document.querySelector("#labelSizeInput"),
  titleSizeValue: document.querySelector("#titleSizeValue"),
  subtitleSizeValue: document.querySelector("#subtitleSizeValue"),
  labelSizeValue: document.querySelector("#labelSizeValue"),
  titleAlignInput: document.querySelector("#titleAlignInput"),
  densityInput: document.querySelector("#densityInput"),
  chartMount: document.querySelector("#chartMount"),
  htmlOutput: document.querySelector("#htmlOutput"),
  previewLabel: document.querySelector("#previewLabel"),
  copyHtmlButton: document.querySelector("#copyHtmlButton"),
  sampleButton: document.querySelector("#sampleButton"),
  downloadPngButton: document.querySelector("#downloadPngButton"),
  downloadSvgButton: document.querySelector("#downloadSvgButton"),
  downloadHtmlButton: document.querySelector("#downloadHtmlButton"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCsv(raw) {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
  const dataRows = rows.length > 1 ? rows.slice(1) : rows;
  const parsed = dataRows
    .map(([label, value]) => ({ label, value: Number(value.replaceAll(",", "")) }))
    .filter((row) => row.label && Number.isFinite(row.value));
  return parsed.length ? parsed : [{ label: "データなし", value: 0 }];
}

function getSize() {
  const [width, height] = state.size.split("x").map(Number);
  return { width, height };
}

function getDensityScale() {
  return { compact: 0.86, standard: 1, editorial: 1.18 }[state.density];
}

function niceMax(value) {
  if (value <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power) * power;
}

function pointsToPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildFontStyle() {
  const imports = fontImports.map((url) => `@import url("${url}");`).join("\n");
  return `<style>
${imports}
text { font-family: ${fontFamily}; font-feature-settings: "palt" 1; }
</style>`;
}

function buildChartSvg() {
  const data = parseCsv(state.csv);
  const { width, height } = getSize();
  const density = getDensityScale();
  const margin = {
    top: Math.round(height * 0.17 * density),
    right: Math.round(width * 0.08 * density),
    bottom: Math.round(height * 0.16 * density),
    left: Math.round(width * 0.1 * density),
  };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const max = niceMax(Math.max(...data.map((item) => item.value)));
  const zeroY = margin.top + chartH;
  const ticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i);
  const slot = chartW / data.length;
  const barW = Math.min(slot * 0.52, width * 0.05);
  const accent = state.accent;
  const bg = state.background;
  const grid = "#e2e3e6";
  const ink = "#111113";
  const muted = "#6d7178";
  const labelEvery = data.length > 9 ? Math.ceil(data.length / 7) : 1;
  const titleX = state.titleAlign === "center" ? width / 2 : margin.left;
  const titleAnchor = state.titleAlign === "center" ? "middle" : "start";
  const titleY = Math.round(height * 0.075);
  const subtitleY = titleY + state.titleSize * 0.82;

  const gridLines = ticks
    .map((tick) => {
      const y = zeroY - (tick / max) * chartH;
      return `
        <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${grid}" stroke-width="2" />
        <text x="${margin.left - 24}" y="${y + state.labelSize * 0.32}" text-anchor="end" font-size="${state.labelSize * 0.9}" font-weight="400" fill="${muted}">${Math.round(tick).toLocaleString("ja-JP")}</text>
      `;
    })
    .join("");

  const labels = data
    .map((item, index) => {
      if (index % labelEvery !== 0 && index !== data.length - 1) return "";
      const x = margin.left + slot * index + slot / 2;
      return `<text x="${x}" y="${zeroY + state.labelSize * 1.95}" text-anchor="middle" font-size="${state.labelSize}" font-weight="400" fill="${muted}">${escapeHtml(item.label)}</text>`;
    })
    .join("");

  const chartBody =
    state.chartType === "bar"
      ? data
          .map((item, index) => {
            const x = margin.left + slot * index + slot / 2 - barW / 2;
            const barH = (item.value / max) * chartH;
            const y = zeroY - barH;
            return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="${accent}" />`;
          })
          .join("")
      : (() => {
          const points = data.map((item, index) => ({
            x: margin.left + slot * index + slot / 2,
            y: zeroY - (item.value / max) * chartH,
          }));
          const circles = points
            .map(
              (point) =>
                `<circle cx="${point.x}" cy="${point.y}" r="8" fill="${bg}" stroke="${accent}" stroke-width="6" />`,
            )
            .join("");
          return `
            <path d="${pointsToPath(points)}" fill="none" stroke="${accent}" stroke-linecap="round" stroke-linejoin="round" stroke-width="8" />
            ${circles}
          `;
        })();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(state.title)}">
  ${buildFontStyle()}
  <rect width="${width}" height="${height}" fill="${bg}" />
  <text x="${titleX}" y="${titleY}" text-anchor="${titleAnchor}" font-size="${state.titleSize}" font-weight="700" fill="${ink}">${escapeHtml(state.title)}</text>
  <text x="${titleX}" y="${subtitleY}" text-anchor="${titleAnchor}" font-size="${state.subtitleSize}" font-weight="400" fill="${muted}">${escapeHtml(state.subtitle)}</text>
  <g>
    ${gridLines}
    <line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="${ink}" stroke-width="2" />
    ${chartBody}
    ${labels}
  </g>
  <text x="${margin.left}" y="${height - Math.round(height * 0.055)}" font-size="${Math.max(22, state.labelSize * 0.9)}" font-weight="400" fill="${muted}">${escapeHtml(state.source)}</text>
  <text x="${width - margin.right}" y="${height - Math.round(height * 0.055)}" text-anchor="end" font-size="24" font-weight="700" fill="${ink}">Chart Studio</text>
</svg>`;
}

function buildHtmlExport(svg) {
  const fontLinks = fontImports
    .map((url) => `<link rel="stylesheet" href="${url}" />`)
    .join("\n    ");
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(state.title)} - Chart Studio</title>
    ${fontLinks}
    <style>
      :root { --font-sans: ${fontFamily}; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f7f5; font-family: var(--font-sans); }
      .chart { width: min(100vw, 1200px); padding: 24px; }
      svg { display: block; width: 100%; height: auto; box-shadow: 0 24px 64px rgba(25, 28, 36, 0.14); }
    </style>
  </head>
  <body>
    <main class="chart">
      ${svg}
    </main>
  </body>
</html>`;
}

function render() {
  const svg = buildChartSvg();
  const html = buildHtmlExport(svg);
  const { width, height } = getSize();
  els.chartMount.innerHTML = svg;
  els.htmlOutput.value = html;
  els.previewLabel.textContent = `${width} x ${height}`;
  els.titleSizeValue.textContent = state.titleSize;
  els.subtitleSizeValue.textContent = state.subtitleSize;
  els.labelSizeValue.textContent = state.labelSize;
  document.documentElement.style.setProperty("--accent", state.accent);
  document.documentElement.style.setProperty("--focus", `${state.accent}1f`);
}

function bindInput(key, element, eventName = "input", transform = (value) => value) {
  element.addEventListener(eventName, () => {
    state[key] = transform(element.value);
    render();
  });
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadPng() {
  if (document.fonts?.ready) await document.fonts.ready;
  const svg = buildChartSvg();
  const { width, height } = getSize();
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "chart-studio.png";
      link.click();
      URL.revokeObjectURL(pngUrl);
    }, "image/png");
  };
  image.src = url;
}

async function copyHtml() {
  await navigator.clipboard.writeText(els.htmlOutput.value);
  els.copyHtmlButton.textContent = "コピー済み";
  window.setTimeout(() => {
    els.copyHtmlButton.textContent = "コピー";
  }, 1200);
}

function loadSample() {
  state.csv = sampleCsv;
  state.title = "月別利用者数の推移";
  state.subtitle = "発表資料にそのまま貼れる、静かなチャート図版。";
  state.source = "出典: サンプルデータ";
  els.csvInput.value = state.csv;
  els.titleInput.value = state.title;
  els.subtitleInput.value = state.subtitle;
  els.sourceInput.value = state.source;
  render();
}

function init() {
  els.csvInput.value = state.csv;
  els.chartType.value = state.chartType;
  els.canvasRatio.value = state.size;
  els.titleInput.value = state.title;
  els.subtitleInput.value = state.subtitle;
  els.sourceInput.value = state.source;
  els.accentInput.value = state.accent;
  els.backgroundInput.value = state.background;
  els.titleSizeInput.value = state.titleSize;
  els.subtitleSizeInput.value = state.subtitleSize;
  els.labelSizeInput.value = state.labelSize;
  els.titleAlignInput.value = state.titleAlign;
  els.densityInput.value = state.density;

  bindInput("csv", els.csvInput);
  bindInput("chartType", els.chartType, "change");
  bindInput("title", els.titleInput);
  bindInput("subtitle", els.subtitleInput);
  bindInput("source", els.sourceInput);
  bindInput("accent", els.accentInput);
  bindInput("background", els.backgroundInput);
  bindInput("titleSize", els.titleSizeInput, "input", Number);
  bindInput("subtitleSize", els.subtitleSizeInput, "input", Number);
  bindInput("labelSize", els.labelSizeInput, "input", Number);
  bindInput("titleAlign", els.titleAlignInput, "change");
  bindInput("density", els.densityInput, "change");
  els.canvasRatio.addEventListener("change", () => {
    state.size = els.canvasRatio.value;
    render();
  });

  els.copyHtmlButton.addEventListener("click", copyHtml);
  els.sampleButton.addEventListener("click", loadSample);
  els.downloadPngButton.addEventListener("click", downloadPng);
  els.downloadSvgButton.addEventListener("click", () => {
    downloadText("chart-studio.svg", buildChartSvg(), "image/svg+xml;charset=utf-8");
  });
  els.downloadHtmlButton.addEventListener("click", () => {
    downloadText("chart-studio.html", els.htmlOutput.value, "text/html;charset=utf-8");
  });

  render();
}

init();
