<template>
  <div>
    <canvas ref="canvasRef" style="width:100%;height:auto;display:block;"></canvas>
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
  pageNum: { type: Number, default: 1 }
});
const emit = defineEmits(["loaded","rendered"]);

const canvasRef = ref(null);
let pdfDoc = null;

async function loadPdf(){
  if(!props.pdfUrl){
    pdfDoc = null;
    return;
  }
  pdfDoc = await pdfjsLib.getDocument({ url: props.pdfUrl }).promise;
  emit("loaded", { pageCount: pdfDoc.numPages });
  await renderPage();
}

async function renderPage(){
  if(!pdfDoc || !canvasRef.value) return;

  const page = await pdfDoc.getPage(props.pageNum);
  const viewport = page.getViewport({ scale: 1.25 });

  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;
  emit("rendered");
}

watch(()=>props.pdfUrl, async ()=>{
  await nextTick();
  await loadPdf();
});
watch(()=>props.pageNum, async ()=>{
  await nextTick();
  await renderPage();
});

onBeforeUnmount(()=>{
  try{
    pdfDoc?.destroy?.();
  }catch(e){}
});
</script>

<style scoped>
.empty{
  margin-top: 10px;
  color: rgba(17,19,24,.65);
  font-size: 12px;
  padding: 8px 2px;
}
</style>
