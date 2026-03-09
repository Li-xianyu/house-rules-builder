<template>
  <div ref="wrapRef" class="pdfWrap">
    <div ref="pagesRef" class="pagesCol"></div>
    <div v-if="!pdfUrl" class="empty">尚未生成 PDF。到最后一步点击“生成/刷新 PDF”。</div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const props = defineProps({
  pdfUrl: { type: String, default: "" },
  pageNum: { type: Number, default: 1 },
  viewMode: { type: String, default: "single" }, // single | all
  zoomScale: { type: Number, default: 1.25 },
  zoomMode: { type: String, default: "fit-width" } // manual | fit-width | fit-page
});
const emit = defineEmits(["loaded", "rendered"]);

const wrapRef = ref(null);
const pagesRef = ref(null);
let pdfDoc = null;
let resizeObserver = null;
let renderToken = 0;

async function loadPdf() {
  if (!props.pdfUrl) {
    pdfDoc = null;
    clearPages();
    return;
  }
  pdfDoc = await pdfjsLib.getDocument({ url: props.pdfUrl }).promise;
  emit("loaded", { pageCount: pdfDoc.numPages });
  await renderPage();
}

function clearPages() {
  if (!pagesRef.value) return;
  pagesRef.value.innerHTML = "";
}

function calcScale(base, zoomMode = props.zoomMode) {
  let scale = Number(props.zoomScale || 1.25);
  const w = Math.max(240, (wrapRef.value?.clientWidth || base.width) - 8);
  const h = Math.max(240, (wrapRef.value?.clientHeight || base.height) - 8);

  if (zoomMode === "fit-width") {
    // 适宽基础上轻微放大，提升可读性
    scale = (w / base.width) * 1.06;
  } else if (zoomMode === "fit-page") {
    const fitScale = Math.min(w / base.width, h / base.height);
    scale = Number.isFinite(fitScale) ? fitScale : scale;
  }

  return Math.max(0.5, Math.min(3, scale));
}

async function renderOne(pageIndex, token) {
  if (!pdfDoc || !pagesRef.value) return;
  const page = await pdfDoc.getPage(pageIndex);
  if (token !== renderToken) return;

  const base = page.getViewport({ scale: 1 });
  // 全文模式下，适页通常过小，自动转为适宽提高可读性。
  const actualMode = props.viewMode === "all" && props.zoomMode === "fit-page"
    ? "fit-width"
    : props.zoomMode;
  const scale = calcScale(base, actualMode);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.className = "pdfCanvas";
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  pagesRef.value.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
  emit("rendered", { scale });
}

async function renderPage() {
  if (!pdfDoc || !pagesRef.value) return;
  renderToken += 1;
  const token = renderToken;
  clearPages();

  if (props.viewMode === "all") {
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      await renderOne(i, token);
      if (token !== renderToken) return;
    }
  } else {
    const n = Math.min(pdfDoc.numPages, Math.max(1, Number(props.pageNum || 1)));
    await renderOne(n, token);
  }
}

watch(
  () => props.pdfUrl,
  async () => {
    await nextTick();
    await loadPdf();
  },
  { immediate: true }
);

watch(
  () => props.pageNum,
  async () => {
    await nextTick();
    if (props.viewMode === "single") {
      await renderPage();
    }
  }
);

watch(
  () => props.viewMode,
  async () => {
    await nextTick();
    await renderPage();
  }
);

watch(
  () => props.zoomScale,
  async () => {
    await nextTick();
    await renderPage();
  }
);

watch(
  () => props.zoomMode,
  async () => {
    await nextTick();
    await renderPage();
  }
);

watch(
  () => props.pdfUrl,
  () => {
    if (!wrapRef.value) return;
    resizeObserver?.disconnect?.();
    resizeObserver = new ResizeObserver(() => {
      if (props.zoomMode !== "manual") {
        renderPage();
      }
    });
    resizeObserver.observe(wrapRef.value);
  }
);

onBeforeUnmount(() => {
  try {
    pdfDoc?.destroy?.();
  } catch (e) {}
  try {
    resizeObserver?.disconnect?.();
  } catch (e) {}
});
</script>

<style scoped>
.pdfWrap {
  width: 100%;
  height: auto;
  min-height: 240px;
  overflow: auto;
}
.pdfWrap.allMode{
  overflow-x: hidden;
}
.pagesCol {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.pdfCanvas {
  display: block;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
  background: #fff;
  max-width: none;
}
.allMode .pdfCanvas{
  width: 100% !important;
  height: auto !important;
}
.empty {
  margin-top: 12px;
  color: rgba(17, 19, 24, 0.65);
  font-size: 12px;
  padding: 8px 6px;
}
@media (min-width: 981px){
  .pdfWrap{
    height: 100%;
  }
}
</style>
