const sampleCsv = `Month,Revenue
Jan,420
Feb,560
Mar,510
Apr,720
May,860
Jun,930
Jul,1080`;

const state = {
  csv: sampleCsv,
  chartType: "bar",
  size: "1920x1080",
  title: "Quarterly revenue momentum",
  subtitle: "A clean chart export for decks, reports, and product notes.",
  source: "Source: Sample data",
  accent: "#1262ff",
  background: "#ffffff",
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
  chartMount: document.querySelector("#chartMount"),
  htmlOutput: document.querySelector("#htmlOutput"),
  previewLabel: document.querySelector("#previewLabel"),
  copyHtmlButton: document.querySelector("#copyHtmlButton"),
  downloadPngButton: document.querySelector("#downloadPngButton"),
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
    .map(([label, value]) => ({ label, value: Number(value) }))
    .filter((row) => row.label && Number.isFinite(row.value));

  return parsed.length ? parsed : [{ label: "No data", value: 0 }];
}

function getSize() {
  const [width, height] = state.size.split("x").map(Number);
  return { width, height };
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

function buildChartSvg() {
  const data = parseCsv(state.csv);
  const { width, height } = getSize();
  const margin = {
    top: Math.round(height * 0.18),
    right: Math.round(width * 0.08),
    bottom: Math.round(height * 0.17),
    left: Math.round(width * 0.1),
  };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const max = niceMax(Math.max(...data.map((item) => item.value)));
  const zeroY = margin.top + chartH;
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (max / tickCount) * i);
  const slot = chartW / data.length;
  const barW = Math.min(slot * 0.56, 96);
  const accent = state.accent;
  const bg = state.background;
  const grid = "#dfe4ec";
  const ink = "#14171f";
  const muted = "#667085";
  const labelEvery = data.length > 9 ? Math.ceil(data.length / 7) : 1;

  const gridLines = ticks
    .map((tick) => {
      const y = zeroY - (tick / max) * chartH;
      return `
        <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${grid}" stroke-width="2" />
        <text x="${margin.left - 24}" y="${y + 9}" text-anchor="end" font-size="26" fill="${muted}">${Math.round(tick).toLocaleString()}</text>
      `;
    })
    .join("");

  const labels = data
    .map((item, index) => {
      if (index % labelEvery !== 0 && index !== data.length - 1) return "";
      const x = margin.left + slot * index + slot / 2;
      return `<text x="${x}" y="${zeroY + 54}" text-anchor="middle" font-size="28" fill="${muted}">${escapeHtml(item.label)}</text>`;
    })
    .join("");

  const chartBody =
    state.chartType === "bar"
      ? data
          .map((item, index) => {
            const x = margin.left + slot * index + slot / 2 - barW / 2;
            const barH = (item.value / max) * chartH;
            const y = zeroY - barH;
            return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="10" fill="${accent}" />`;
          })
          .join("")
      : (() => {
          const points = data.map((item, index) => ({
            x: margin.left + slot * index + slot / 2,
            y: zeroY - (item.value / max) * chartH,
          }));
          const circles = points
            .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="9" fill="${bg}" stroke="${accent}" stroke-width="7" />`)
            .join("");
          return `
            <path d="${pointsToPath(points)}" fill="none" stroke="${accent}" stroke-linecap="round" stroke-linejoin="round" stroke-width="9" />
            ${circles}
          `;
        })();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(state.title)}">
  <rect width="${width}" height="${height}" fill="${bg}" />
  <text x="${margin.left}" y="${Math.round(height * 0.08)}" font-size="60" font-weight="800" fill="${ink}">${escapeHtml(state.title)}</text>
  <text x="${margin.left}" y="${Math.round(height * 0.125)}" font-size="30" fill="${muted}">${escapeHtml(state.subtitle)}</text>
  <g>
    ${gridLines}
    <line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="${ink}" stroke-width="3" />
    ${chartBody}
    ${labels}
  </g>
  <text x="${margin.left}" y="${height - Math.round(height * 0.055)}" font-size="26" fill="${muted}">${escapeHtml(state.source)}</text>
  <text x="${width - margin.right}" y="${height - Math.round(height * 0.055)}" text-anchor="end" font-size="24" font-weight="800" fill="${ink}">Chart Studio</text>
</svg>`;
}

function buildHtmlExport(svg) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(state.title)} - Chart Studio</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f5f8; }
      .chart { width: min(100vw, 1200px); padding: 24px; }
      svg { display: block; width: 100%; height: auto; box-shadow: 0 24px 64px rgba(25, 28, 36, 0.18); }
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
  els.previewLabel.textContent = `${width} x ${height} SVG`;
  document.documentElement.style.setProperty("--accent", state.accent);
  document.documentElement.style.setProperty("--focus", `${state.accent}2e`);
}

function bindInput(key, element, eventName = "input") {
  element.addEventListener(eventName, () => {
    state[key] = element.value;
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
  els.copyHtmlButton.textContent = "Copied";
  window.setTimeout(() => {
    els.copyHtmlButton.textContent = "Copy";
  }, 1200);
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

  bindInput("csv", els.csvInput);
  bindInput("chartType", els.chartType, "change");
  els.canvasRatio.addEventListener("change", () => {
    state.size = els.canvasRatio.value;
    render();
  });
  bindInput("title", els.titleInput);
  bindInput("subtitle", els.subtitleInput);
  bindInput("source", els.sourceInput);
  bindInput("accent", els.accentInput);
  bindInput("background", els.backgroundInput);

  els.copyHtmlButton.addEventListener("click", copyHtml);
  els.downloadPngButton.addEventListener("click", downloadPng);
  els.downloadHtmlButton.addEventListener("click", () => {
    downloadText("chart-studio.html", els.htmlOutput.value, "text/html;charset=utf-8");
  });

  render();
}

init();
