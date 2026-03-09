import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

let _fontBytesCache = null;
let _boldBytesCache = null;

async function getFontBytes(){
	if(_fontBytesCache) return _fontBytesCache;

	const url = new URL("../assets/fonts/NotoSansSC-Regular.subset.ttf", import.meta.url);
	const buf = await fetch(url).then(r=>{
		if(!r.ok) throw new Error("字体加载失败："+r.status);
		return r.arrayBuffer();
	});

	_fontBytesCache = new Uint8Array(buf);
	return _fontBytesCache;
}

async function getBoldBytes(){
	if(_boldBytesCache) return _boldBytesCache;

	const url = new URL("../assets/fonts/NotoSansSC-Bold.subset.ttf", import.meta.url);
	const buf = await fetch(url).then(r=>{
		if(!r.ok) throw new Error("粗体字体加载失败："+r.status);
		return r.arrayBuffer();
	});

	_boldBytesCache = new Uint8Array(buf);
	return _boldBytesCache;
}

function linesToArray(s){
	return String(s || "")
		.split(/\r?\n/)
		.map(x => x.trim())
		.filter(Boolean);
}

function cnNum(n){
	const map = ["零","一","二","三","四","五","六","七","八","九","十"];
	if(n <= 10) return map[n];
	const tens = Math.floor(n / 10);
	const ones = n % 10;
	if(tens === 1) return "十" + (ones ? map[ones] : "");
	return map[tens] + "十" + (ones ? map[ones] : "");
}

const SECTION_TITLE_DEFAULTS = Object.freeze({
	principles: "原则与安全",
	rules: "家规条款",
	execution: "通用执行细则",
	rewards: "奖励与正向强化",
	review: "审查、修改与终止"
});

function normalizeSectionTitles(input){
	const src = input && typeof input === "object" ? input : {};
	const take = (key)=>{
		const val = String(src[key] ?? "").trim();
		return val || SECTION_TITLE_DEFAULTS[key];
	};
	return {
		principles: take("principles"),
		rules: take("rules"),
		execution: take("execution"),
		rewards: take("rewards"),
		review: take("review")
	};
}

function buildDocText(state){
	const mode = String(state.mode || "solo");
	const sectionTitles = normalizeSectionTitles(state.sectionTitles);
	const A = String(state.base?.partyA || "").trim() || "甲方";
	const B = String(state.base?.partyB || "").trim() || "乙方";
	const labelA = (mode === "solo") ? "监督方" : "甲方";
	const labelB = (mode === "solo") ? "执行方" : "乙方";

	const lines = [];

	// 这里不再输出“签订日期”，因为页头已经有了，避免重复
	if(A) lines.push(`${labelA}：${A}`);
	if(B) lines.push(`${labelB}：${B}`);
	if(lines.length) lines.push("");

	const sections = [];

	// 一、原则与安全
	{
		const s = [];

		if(state.base?.safeword){
			s.push(`安全词：${state.base.safeword}`);
		}

		const hard = linesToArray(state.base?.hardLimitsText);
		if(hard.length){
			s.push("硬性边界：");
			hard.forEach((x, i) => s.push(`  (${i + 1}) ${x}`));
		}

		const ac = (state.base?.aftercare || []).filter(Boolean);
		if(ac.length){
			s.push("关怀与复盘：");
			ac.forEach((x, i) => s.push(`  (${i + 1}) ${x}`));
		}

		if(state.base?.sscAccepted){
			s.push(`原则声明：本协议基于自愿与可控原则；${mode === "solo" ? "本人" : "任何一方均"}可随时停止执行。`);
		}

		if(s.length){
			sections.push({ title: sectionTitles.principles, lines: s });
		}
	}

	// 二、家规条款
	{
		const s = [];
		let catNo = 0;

		(state.categories || []).forEach(cat => {
			const rules = (cat.rules || []).filter(r => r && String(r.desc || "").trim());
			if(!rules.length) return;

			catNo++;
			s.push(`${catNo}. ${cat.title}`);

			rules.forEach((r, idx) => {
				s.push(`  ${catNo}.${idx + 1} 条款：${String(r.desc || "").trim()}`);

				if(String(r.criteria || "").trim()){
					s.push(`      判定标准：${String(r.criteria).trim()}`);
				}

				const reviewCycle = String(r.reviewCycle || "").trim();
				const allowRemit = !!r.allowRemit;

				if(reviewCycle || r.allowRemit !== undefined){
					const a = reviewCycle ? `审查周期：${reviewCycle}` : "";
					const b = `允许减免：${allowRemit ? "是" : "否"}`;
					s.push(`      ${[a, b].filter(Boolean).join("；")}`);
				}

				const tiers = (r.tiers || []).filter(t => t && String(t.text || "").trim());
				if(tiers.length){
					s.push("      惩罚梯度：");
					tiers.forEach(t => {
						const lv = String(t.level || "").trim() || "档位";
						const tx = String(t.text || "").trim();
						s.push(`        - ${lv}：${tx}`);
					});
				}
			});

			s.push("");
		});

		while(s.length && s[s.length - 1] === "") s.pop();

		if(s.length){
			sections.push({ title: sectionTitles.rules, lines: s });
		}
	}

	// 三、通用执行细则
	{
		const kit = state.kit || {};
		const s = [];

		const methods = (kit.methods || []).filter(Boolean);
		const nonPhysical = (kit.nonPhysical || []).filter(Boolean);
		const process = String(kit.process || "").trim();

		if(methods.length){
			s.push("通用方式/手段：");
			methods.forEach((x, i) => s.push(`  (${i + 1}) ${x}`));
		}

		if(nonPhysical.length){
			s.push("非身体类惩罚：");
			nonPhysical.forEach((x, i) => s.push(`  (${i + 1}) ${x}`));
		}

		if(process){
			s.push("通用流程：");
			linesToArray(process).forEach(x => s.push(`  ${x}`));
		}

		if(s.length){
			sections.push({ title: sectionTitles.execution, lines: s });
		}
	}

	// 四、奖励与正向强化
	{
		const s = [];
		const rewards = (state.rewards || []).filter(r => r && String(r.when || "").trim() && String(r.then || "").trim());

		rewards.forEach((rw, i) => {
			s.push(`${i + 1}. 若 ${String(rw.when).trim()}，则 ${String(rw.then).trim()}`);
		});

		if(s.length){
			sections.push({ title: sectionTitles.rewards, lines: s });
		}
	}

	// 五、审查、修改与终止
	{
		const rv = state.review || {};
		const s = [];

		const cycle = String(rv.cycle || "").trim();
		const modify = String(rv.modify || "").trim();
		const terminate = String(rv.terminate || "").trim();
		const notes = String(rv.notes || "").trim();

		if(cycle) s.push(`审查周期：${cycle}`);
		if(modify) s.push(`修改方式：${modify}`);
		if(terminate) s.push(`终止条件：${terminate}`);

		if(notes){
			s.push("备注：");
			linesToArray(notes).forEach(x => s.push(`  ${x}`));
		}

		if(s.length){
			sections.push({ title: sectionTitles.review, lines: s });
		}
	}

	sections.forEach((sec, idx) => {
		lines.push(`${cnNum(idx + 1)}、${sec.title}`);
		sec.lines.forEach(l => lines.push(l));
		lines.push("");
	});

	lines.push("签署栏：");
	if(mode === "solo"){
		lines.push("签署：__________    日期：__________");
	}else{
		lines.push("甲方：__________    乙方：__________    日期：__________");
	}

	return lines.join("\n");
}

function isSectionHeader(line){
	return /^[一二三四五六七八九十]+、/.test(line.trim());
}

function isSubHeader(line){
	return /^\d+\.\s+/.test(line.trim());
}

function isLeadLine(line){
	const t = line.trim();
	if(!/：\s*$/.test(t)) return false;

	const keys = [
		"硬性边界",
		"关怀与复盘",
		"惩罚梯度",
		"通用方式",
		"非身体类惩罚",
		"通用流程",
		"备注",
		"签署栏"
	];

	return keys.some(k => t.includes(k));
}

function isListItem(line){
	return /^\s*[-•]\s+/.test(line);
}

function formatDateValue(v){
	if(!v) return "";

	if(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())){
		return v.trim();
	}

	const d = v instanceof Date ? v : new Date(v);
	if(Number.isNaN(d.getTime())){
		return String(v).trim();
	}

	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function splitIndent(line){
	const m = String(line || "").match(/^(\s+)(.*)$/);
	const indentStr = m ? m[1] : "";
	const content = m ? m[2] : String(line || "");
	const indentLevel = Math.floor(indentStr.length / 2);
	return {
		indentStr,
		content,
		indentLevel
	};
}

function wrapTextByWidth(rawLine, maxWidth, font, fontSize, measureTextWidth){
	const line = String(rawLine || "");
	if(!line) return [""];

	const { indentStr, content } = splitIndent(line);

	if(!content) return [indentStr];

	const out = [];
	let s = content;

	const preferBreakChars = [" ", "，", "。", "；", "、", ",", ".", ";", "：", "！", "？", "）", "】", "」", "》"];

	while(s.length){
		const full = indentStr + s;
		if(measureTextWidth(full, font, fontSize) <= maxWidth){
			out.push(full);
			break;
		}

		let lo = 1;
		let hi = s.length;
		let best = 1;

		while(lo <= hi){
			const mid = (lo + hi) >> 1;
			const candidate = indentStr + s.slice(0, mid);
			if(measureTextWidth(candidate, font, fontSize) <= maxWidth){
				best = mid;
				lo = mid + 1;
			}else{
				hi = mid - 1;
			}
		}

		let cut = best;

		const slice = s.slice(0, cut);
		let breakAt = -1;
		for(let i = slice.length - 1; i >= Math.max(0, slice.length - 24); i--){
			if(preferBreakChars.includes(slice[i])){
				breakAt = i + 1;
				break;
			}
		}
		if(breakAt >= 10) cut = breakAt;

		out.push(indentStr + s.slice(0, cut).trimEnd());
		s = s.slice(cut).trimStart();
	}

	return out;
}

export async function makePdfBytes(state){
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);

	const fontBytes = await getFontBytes();
	const boldBytes = await getBoldBytes();

	const font = await doc.embedFont(fontBytes, {});
	const fontBold = await doc.embedFont(boldBytes, {});

	const pageW = 595.28;
	const pageH = 841.89;

	const marginX = 42;
	const marginTop = 56;
	const marginBottom = 54;

	const bodySize = 12;
	const lineH = Math.round(bodySize * 1.6);

	const h1Size = 14;
	const h2Size = 12.5;

	const ink = rgb(0.10, 0.12, 0.14);
	const inkLight = rgb(0.35, 0.37, 0.40);

	// 文本宽度测量缓存
	const widthCache = new Map();

	function fontKeyOf(f){
		return f === fontBold ? "b" : "r";
	}

	function measureTextWidth(text, f, size){
		const key = `${fontKeyOf(f)}|${size}|${text}`;
		if(widthCache.has(key)) return widthCache.get(key);
		const w = f.widthOfTextAtSize(text, size);
		widthCache.set(key, w);
		return w;
	}

	let page = doc.addPage([pageW, pageH]);
	const pages = [page];

	const title = String(state.base?.title || "").trim() || "家规与自律协议";
	const titleSize = 20;
	const titleY = pageH - marginTop;

	const titleW = measureTextWidth(title, fontBold, titleSize);
	page.drawText(title, {
		x: (pageW - titleW) / 2,
		y: titleY - titleSize,
		size: titleSize,
		font: fontBold,
		color: ink
	});

	const dateText = formatDateValue(state.base?.date);
	const dateLine = `（签订日期：${dateText}）`;
	const dateSize = 10;
	const dateW = measureTextWidth(dateLine, font, dateSize);
	page.drawText(dateLine, {
		x: (pageW - dateW) / 2,
		y: titleY - titleSize - 18,
		size: dateSize,
		font,
		color: inkLight
	});

	let y = titleY - titleSize - 40;

	function newPage(){
		page = doc.addPage([pageW, pageH]);
		pages.push(page);
		y = pageH - marginTop;
	}

	function keepNextCountFor(rawLine){
		if(isSectionHeader(rawLine)) return 2;
		if(isSubHeader(rawLine)) return 3;
		if(isLeadLine(rawLine)) return 1;
		if(isListItem(rawLine)) return 1;
		return 0;
	}

	function styleFor(rawLine){
		if(isSectionHeader(rawLine)) return { font: fontBold, size: h1Size };
		if(isSubHeader(rawLine)) return { font: fontBold, size: h2Size };
		return { font, size: bodySize };
	}

	function indentXFromLevel(indentLevel){
		return marginX + indentLevel * 12;
	}

	// 先构造正文
	const text = buildDocText(state);
	const rawLines = String(text || "").split("\n");

	// 预排版缓存：避免主循环、keepNext、绘制阶段来回重复 wrap
	const preparedLines = rawLines.map(raw => {
		const trimmed = raw.trim();

		if(!trimmed){
			return {
				raw,
				empty: true,
				style: null,
				keepNext: 0,
				indentLevel: 0,
				wrapped: [],
				lineCount: 1
			};
		}

		const style = styleFor(raw);
		const keepNext = keepNextCountFor(raw);
		const { indentLevel } = splitIndent(raw);
		const indentX = indentXFromLevel(indentLevel);
		const maxW = pageW - indentX - marginX;
		const wrapped = wrapTextByWidth(raw, maxW, style.font, style.size, measureTextWidth);

		return {
			raw,
			empty: false,
			style,
			keepNext,
			indentLevel,
			wrapped,
			lineCount: Math.max(1, wrapped.length)
		};
	});

	function remainingLinesOnPage(){
		return Math.floor((y - marginBottom) / lineH);
	}

	for(let i = 0; i < preparedLines.length; i++){
		const current = preparedLines[i];

		if(current.empty){
			if(y < marginBottom + lineH) newPage();
			y -= lineH;
			continue;
		}

		const need = current.lineCount;

		let keepNeed = 0;
		if(current.keepNext > 0){
			let got = 0;
			for(let j = i + 1; j < preparedLines.length && got < current.keepNext; j++){
				const nextItem = preparedLines[j];
				if(nextItem.empty) continue;
				keepNeed += nextItem.lineCount;
				got++;
			}
		}

		if(remainingLinesOnPage() < (need + keepNeed)){
			newPage();
		}

		for(const wl of current.wrapped){
			if(y < marginBottom + lineH) newPage();

			const { indentLevel, content } = splitIndent(wl);
			const x = indentXFromLevel(indentLevel);

			page.drawText(content, {
				x,
				y: y - current.style.size,
				size: current.style.size,
				font: current.style.font,
				color: ink
			});
			y -= lineH;
		}
	}

	const pageNumSize = 9;
	for(let p = 0; p < pages.length; p++){
		const label = `- ${p + 1} -`;
		const w = measureTextWidth(label, font, pageNumSize);
		pages[p].drawText(label, {
			x: (pageW - w) / 2,
			y: 18,
			size: pageNumSize,
			font,
			color: inkLight
		});
	}

	return await doc.save();
}
