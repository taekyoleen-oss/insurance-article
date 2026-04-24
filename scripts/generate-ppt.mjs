import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PptxGenJS = require('C:/Users/tklee/AppData/Roaming/npm/node_modules/pptxgenjs');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── 출력 파일명 중복 방지 ───────────────────────────────────────────────
function resolveOutputPath(dir, baseName = 'InsuranceNewsDashboard') {
  let candidate = path.join(dir, `${baseName}.pptx`);
  if (!fs.existsSync(candidate)) return candidate;
  let n = 2;
  while (true) {
    candidate = path.join(dir, `${baseName}_${n}.pptx`);
    if (!fs.existsSync(candidate)) return candidate;
    n++;
  }
}

// ─── 레이아웃 상수 (LAYOUT_WIDE 16:9) ──────────────────────────────────
const SLIDE = { W: 13.33, H: 7.5 };
const L = {
  HDR: 1.05,
  Y0:  1.12,
  YB:  6.80,
  XL:  0.40,
  XR:  12.93,
};
L.W  = L.XR - L.XL;   // 12.53
L.AH = L.YB - L.Y0;   // 5.68

// ─── 색상 & 폰트 ────────────────────────────────────────────────────────
const C = {
  navy:   '1E3A5F',
  blue:   '2563EB',
  teal:   '0891B2',
  green:  '059669',
  amber:  'D97706',
  white:  'FFFFFF',
  black:  '111827',
  sub:    '374151',
  gray:   '6B7280',
  lite:   'F9FAFB',
  bdr:    'E5E7EB',
  skyBg:  'EFF6FF',
  greenBg:'ECFDF5',
  amberBg:'FFFBEB',
  tealBg: 'F0F9FF',
};
const F = 'Noto Sans KR';

// ─── 카드 높이 자동 계산 ────────────────────────────────────────────────
function calcCardH(startY, rows, gap = 0.10, margin = 0.05) {
  const available = (L.YB - margin) - startY;
  const cardH = (available - gap * (rows - 1)) / rows;
  return Math.max(cardH, 0.40);
}

function assertInBounds(y, h, label) {
  if (y + h > L.YB) console.warn(`⚠ OVERFLOW [${label}]: ${(y+h).toFixed(3)} > ${L.YB}`);
}

// ─── 공통 헤더 바 ────────────────────────────────────────────────────────
function addHeader(s, title, num, color = C.navy) {
  s.addShape('rect', { x: 0, y: 0, w: SLIDE.W, h: L.HDR, fill: { color }, line: { color } });
  const label = num ? `${num}   ${title}` : title;
  s.addText(label, {
    x: L.XL, y: 0.10, w: L.W, h: 0.85,
    fontSize: 27, bold: true, color: C.white, fontFace: F,
    valign: 'middle',
  });
}

// ─── 섹션 구분 배너 ──────────────────────────────────────────────────────
function addSectionBanner(s, text, y, bgColor = C.skyBg, textColor = C.navy) {
  s.addShape('rect', { x: L.XL, y, w: L.W, h: 0.52, fill: { color: bgColor }, line: { color: C.bdr, width: 0.5 } });
  s.addText(text, { x: L.XL + 0.20, y, w: L.W - 0.40, h: 0.52, fontSize: 16, bold: true, color: textColor, fontFace: F, valign: 'middle' });
}

// ─── 번호 원형 배지 ──────────────────────────────────────────────────────
function addCircleBadge(s, num, x, y, size = 0.50, bgColor = C.navy) {
  s.addShape('ellipse', { x, y, w: size, h: size, fill: { color: bgColor }, line: { color: bgColor } });
  s.addText(String(num), { x, y, w: size, h: size, fontSize: size > 0.45 ? 18 : 14, bold: true, color: C.white, fontFace: F, align: 'center', valign: 'middle' });
}

// ─── 아이콘 카드 (심플) ─────────────────────────────────────────────────
function addIconCard(s, { x, y, w, h, icon, title, desc, titleColor = C.navy, bgColor = C.lite, borderColor = C.bdr, titleSize = 18, descSize = 14 }) {
  s.addShape('rect', { x, y, w, h, fill: { color: bgColor }, line: { color: borderColor, width: 0.75 } });
  const pad = 0.16;
  const iH  = Math.min(h * 0.36, 0.62);
  s.addText(`${icon}  ${title}`, {
    x: x + pad, y: y + 0.10, w: w - pad * 2, h: iH,
    fontSize: titleSize, bold: true, color: titleColor, fontFace: F,
    valign: 'top', fit: 'shrink',
  });
  const dY = y + 0.10 + iH + 0.06;
  const dH = h - 0.10 - iH - 0.12;
  s.addText(desc, {
    x: x + pad, y: dY, w: w - pad * 2, h: Math.max(dH, 0.30),
    fontSize: descSize, color: C.sub, fontFace: F,
    valign: 'top', wrap: true, fit: 'shrink',
    lineSpacingMultiple: 1.30,
  });
  assertInBounds(y, h, title);
}

// ════════════════════════════════════════════════════════════════════════
//  PPT 생성
// ════════════════════════════════════════════════════════════════════════
const pptx = new PptxGenJS();
pptx.layout  = 'LAYOUT_WIDE';
pptx.author  = '보험 뉴스 대시보드';
pptx.title   = '보험 뉴스 대시보드 — 앱 소개';

// ════════════════════════════════════════════════════════════════════════
// 1. 표지
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: SLIDE.W, h: SLIDE.H, fill: { color: C.navy }, line: { color: C.navy } });
  s.addShape('rect', { x: 0, y: 4.80, w: SLIDE.W, h: 2.70, fill: { color: '0F2544' }, line: { color: '0F2544' } });

  // 아이콘 원
  s.addShape('ellipse', { x: 5.90, y: 0.50, w: 1.53, h: 1.53, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText('📰', { x: 5.90, y: 0.50, w: 1.53, h: 1.53, fontSize: 42, align: 'center', valign: 'middle' });

  s.addText('보험 뉴스 대시보드', {
    x: 1.0, y: 2.20, w: 11.33, h: 1.00,
    fontSize: 50, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'middle', fit: 'shrink',
  });
  s.addText('매일 아침·오후, 보험 뉴스를 자동으로 모아 AI가 요약해 드립니다', {
    x: 1.0, y: 3.30, w: 11.33, h: 0.60,
    fontSize: 19, color: '94C3E0', fontFace: F,
    align: 'center', valign: 'middle', wrap: true,
  });

  // 핵심 특징 3개
  const feats = ['📡 하루 2회 자동 수집', '🤖 AI 3줄 요약', '🔍 직접 검색 가능'];
  const fW = 3.50, fGap = 0.30;
  const totalFW = feats.length * fW + (feats.length - 1) * fGap;
  let fx = (SLIDE.W - totalFW) / 2;
  for (const f of feats) {
    s.addShape('rect', { x: fx, y: 4.10, w: fW, h: 0.52, fill: { color: '1D4ED8' }, line: { color: '3B82F6', width: 0.5 }, rounding: 0.10 });
    s.addText(f, { x: fx, y: 4.10, w: fW, h: 0.52, fontSize: 15, color: C.white, fontFace: F, align: 'center', valign: 'middle', bold: true });
    fx += fW + fGap;
  }

  s.addText('2026  |  v1.0', {
    x: 0, y: 6.90, w: SLIDE.W, h: 0.40,
    fontSize: 13, color: '7DA3C8', fontFace: F, align: 'center',
  });
}

// ════════════════════════════════════════════════════════════════════════
// 2. 목차
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '목차', '');

  const items = [
    { n: '01', t: '앱 소개', sub: '무엇을 하는 앱인가요?' },
    { n: '02', t: '주요 특징', sub: '이 앱만의 장점 4가지' },
    { n: '03', t: '뉴스 자동 수집', sub: '매일 알아서 뉴스를 모아옵니다' },
    { n: '04', t: 'AI 뉴스 요약', sub: 'AI가 핵심만 3줄로 정리해 드립니다' },
    { n: '05', t: '화면 구성', sub: '메인 화면 각 영역 안내' },
    { n: '06', t: '기사 상세 보기', sub: '클릭 한 번으로 자세한 내용 확인' },
    { n: '07', t: '직접 검색', sub: '원하는 키워드로 즉시 검색' },
    { n: '08', t: '이용 방법', sub: '단계별 사용 가이드' },
  ];

  const COL_GAP = 0.20;
  const colW = (L.W - COL_GAP) / 2;
  const ROW_GAP = 0.10;
  const rows = Math.ceil(items.length / 2);
  const cardStartY = L.Y0 + 0.10;
  const cardH = calcCardH(cardStartY, rows, ROW_GAP);

  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = L.XL + col * (colW + COL_GAP);
    const y = cardStartY + row * (cardH + ROW_GAP);

    s.addShape('rect', { x, y, w: colW, h: cardH, fill: { color: C.lite }, line: { color: C.bdr, width: 0.75 } });
    addCircleBadge(s, item.n, x + 0.14, y + (cardH - 0.46) / 2, 0.46, C.navy);
    s.addText(item.t, { x: x + 0.72, y: y + 0.06, w: colW - 0.84, h: cardH * 0.50, fontSize: 16, bold: true, color: C.black, fontFace: F, valign: 'middle', fit: 'shrink' });
    s.addText(item.sub, { x: x + 0.72, y: y + cardH * 0.52, w: colW - 0.84, h: cardH * 0.44, fontSize: 13, color: C.gray, fontFace: F, valign: 'top', wrap: true, fit: 'shrink' });
    assertInBounds(y, cardH, item.t);
  });
}

// ════════════════════════════════════════════════════════════════════════
// 3. 앱 소개
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '앱 소개 — 무엇을 하는 앱인가요?', '01');

  // 중앙 한 문장 강조
  s.addShape('rect', { x: L.XL, y: L.Y0 + 0.05, w: L.W, h: 0.80, fill: { color: C.skyBg }, line: { color: 'BFDBFE', width: 0.75 } });
  s.addText('💡  보험 관련 뉴스를 매일 자동으로 수집하고, AI가 핵심을 요약해서 한눈에 보여주는 서비스입니다', {
    x: L.XL + 0.20, y: L.Y0 + 0.05, w: L.W - 0.40, h: 0.80,
    fontSize: 18, bold: true, color: C.navy, fontFace: F, valign: 'middle', wrap: true, fit: 'shrink',
  });

  // 3개 카드
  const cardStartY = L.Y0 + 1.00;
  const COL_GAP = 0.22;
  const colW = (L.W - COL_GAP * 2) / 3;
  const cardH = calcCardH(cardStartY, 1, 0, 0.05);

  const cards = [
    {
      icon: '👥', title: '이런 분들께 유용합니다',
      desc: '• 보험설계사 · 언더라이터\n• 보험 관련 연구자 · 학생\n• 보험 가입을 고려 중인 소비자\n• 보험업계 동향을 파악하고 싶은 모든 분',
      bg: C.skyBg, border: 'BFDBFE',
    },
    {
      icon: '🎯', title: '핵심 가치',
      desc: '• 매일 쏟아지는 보험 뉴스를 직접 검색할 필요 없이\n• 자동으로 모아주고 AI가 핵심을 정리\n• 바쁜 하루, 1분 만에 보험 업계 흐름 파악',
      bg: C.greenBg, border: 'A7F3D0',
    },
    {
      icon: '📋', title: '제공하는 정보',
      desc: '• 주요 보험사 · 규제 관련 최신 뉴스\n• 생명보험 / 손해보험 / 상품 / 규제 분류\n• 비슷한 주제 기사 묶음으로 제공\n• 원하는 키워드로 직접 검색도 가능',
      bg: C.amberBg, border: 'FCD34D',
    },
  ];

  cards.forEach((card, i) => {
    const x = L.XL + i * (colW + COL_GAP);
    addIconCard(s, { x, y: cardStartY, w: colW, h: cardH, icon: card.icon, title: card.title, desc: card.desc, bgColor: card.bg, borderColor: card.border, titleSize: 17, descSize: 14 });
  });
}

// ════════════════════════════════════════════════════════════════════════
// 4. 주요 특징
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '주요 특징', '02', C.teal);

  const cardStartY = L.Y0 + 0.10;
  const COL_GAP = 0.20;
  const ROW_GAP = 0.12;
  const colW = (L.W - COL_GAP) / 2;
  const cardH = calcCardH(cardStartY, 2, ROW_GAP);

  const features = [
    {
      col: 0, row: 0,
      icon: '⏰', title: '하루 2번, 자동으로 뉴스 수집',
      desc: '매일 오전 8시와 오후 2시,\n따로 아무것도 하지 않아도\n최신 보험 뉴스를 자동으로 모아옵니다.\n\n항상 최신 정보를 제공합니다.',
      bg: C.skyBg, border: 'BFDBFE', titleColor: C.navy,
    },
    {
      col: 1, row: 0,
      icon: '🤖', title: 'AI가 핵심만 3줄로 요약',
      desc: '긴 기사를 읽을 시간이 없어도 괜찮습니다.\nAI(Claude)가 기사의 핵심 내용을\n3줄로 간결하게 정리해 드립니다.\n\n빠른 정보 파악이 가능합니다.',
      bg: 'F5F3FF', border: 'C4B5FD', titleColor: '5B21B6',
    },
    {
      col: 0, row: 1,
      icon: '🗂️', title: '비슷한 기사 묶어서 제공',
      desc: '같은 주제를 다룬 여러 기사를\n하나로 묶어 보여줍니다.\n관련 기사를 클릭 한 번으로\n함께 확인할 수 있습니다.',
      bg: C.greenBg, border: 'A7F3D0', titleColor: '065F46',
    },
    {
      col: 1, row: 1,
      icon: '🔍', title: '원하는 키워드로 직접 검색',
      desc: '자동 수집 외에도\n원하는 키워드를 직접 입력해서\n실시간으로 관련 뉴스를 검색할 수 있습니다.\n\n필요한 정보를 즉시 찾아보세요.',
      bg: C.amberBg, border: 'FCD34D', titleColor: '92400E',
    },
  ];

  for (const f of features) {
    const x = L.XL + f.col * (colW + COL_GAP);
    const y = cardStartY + f.row * (cardH + ROW_GAP);
    addIconCard(s, { x, y, w: colW, h: cardH, icon: f.icon, title: f.title, desc: f.desc, bgColor: f.bg, borderColor: f.border, titleColor: f.titleColor, titleSize: 18, descSize: 14 });
  }
}

// ════════════════════════════════════════════════════════════════════════
// 5. 뉴스 자동 수집
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '뉴스 자동 수집 — 어떻게 작동하나요?', '03', C.navy);

  // 흐름도
  const startY = L.Y0 + 0.12;
  const stepH  = 0.72;
  const stepGap = 0.14;
  const stepW  = 2.20;

  const steps = [
    { icon: '⏰', label: '매일 자동 실행', sub: '오전 8시 / 오후 2시' },
    { icon: '🌐', label: '뉴스 수집', sub: '네이버 뉴스에서\n보험 관련 기사 검색' },
    { icon: '🧹', label: '중복 제거', sub: '이미 저장된 기사는\n자동으로 건너뜀' },
    { icon: '🤖', label: 'AI 요약 처리', sub: 'Claude AI가\n기사 내용 분석·요약' },
    { icon: '💾', label: '데이터베이스 저장', sub: '요약·분류 완료 후\n안전하게 저장' },
  ];

  // 화살표 포함 전체 폭 계산
  const arrowW = 0.36;
  const totalW = steps.length * stepW + (steps.length - 1) * arrowW;
  let sx = L.XL + (L.W - totalW) / 2;

  steps.forEach((step, i) => {
    // 박스
    const bg = ['EFF6FF', 'F0F9FF', 'ECFDF5', 'F5F3FF', 'FFF7ED'][i];
    const border = ['BFDBFE', '7DD3FC', 'A7F3D0', 'C4B5FD', 'FCD34D'][i];
    s.addShape('rect', { x: sx, y: startY, w: stepW, h: stepH, fill: { color: bg }, line: { color: border, width: 1.0 }, rounding: 0.10 });
    s.addText(step.icon, { x: sx, y: startY + 0.06, w: stepW, h: 0.38, fontSize: 26, align: 'center', valign: 'middle' });
    s.addText(step.label, { x: sx + 0.08, y: startY + 0.44, w: stepW - 0.16, h: 0.26, fontSize: 14, bold: true, color: C.black, fontFace: F, align: 'center', fit: 'shrink' });

    if (i < steps.length - 1) {
      s.addText('▶', { x: sx + stepW + 0.02, y: startY + (stepH - 0.28) / 2, w: arrowW - 0.04, h: 0.28, fontSize: 16, color: C.gray, fontFace: F, align: 'center', valign: 'middle' });
    }
    sx += stepW + arrowW;
  });

  // 부연 설명 박스들 (아래쪽)
  const descY = startY + stepH + 0.22;

  // 수집 대상 키워드
  s.addShape('rect', { x: L.XL, y: descY, w: (L.W - 0.22) / 2, h: L.YB - descY - 0.05, fill: { color: C.skyBg }, line: { color: 'BFDBFE', width: 0.75 } });
  s.addText('📌  수집하는 뉴스 종류', { x: L.XL + 0.15, y: descY + 0.12, w: (L.W - 0.22) / 2 - 0.30, h: 0.36, fontSize: 16, bold: true, color: C.navy, fontFace: F });
  const keywords = ['보험', '보험료', '보험상품', '금융감독원 보험'];
  const kDesc = keywords.map(k => `• "${k}" 관련 최신 뉴스`).join('\n');
  s.addText(kDesc + '\n\n각 키워드별 최신 10건씩 수집\n→ 하루 최대 약 40건의 신선한 뉴스', {
    x: L.XL + 0.15, y: descY + 0.54, w: (L.W - 0.22) / 2 - 0.30, h: L.YB - descY - 0.05 - 0.60,
    fontSize: 14, color: C.sub, fontFace: F, valign: 'top', wrap: true, fit: 'shrink', lineSpacingMultiple: 1.35,
  });

  // 에디션 설명
  const rX3 = L.XL + (L.W - 0.22) / 2 + 0.22;
  const rW3 = L.W - (L.W - 0.22) / 2 - 0.22;
  s.addShape('rect', { x: rX3, y: descY, w: rW3, h: L.YB - descY - 0.05, fill: { color: C.amberBg }, line: { color: 'FCD34D', width: 0.75 } });
  s.addText('📅  에디션이란?', { x: rX3 + 0.15, y: descY + 0.12, w: rW3 - 0.30, h: 0.36, fontSize: 16, bold: true, color: '92400E', fontFace: F });
  s.addText('수집 시점을 "에디션"이라고 부릅니다.\n\n• 오전 에디션  (08:00 수집)\n• 오후 에디션  (14:00 수집)\n\n날짜와 에디션을 선택하면\n해당 시점에 수집된 뉴스를 볼 수 있습니다.', {
    x: rX3 + 0.15, y: descY + 0.54, w: rW3 - 0.30, h: L.YB - descY - 0.05 - 0.60,
    fontSize: 14, color: '78350F', fontFace: F, valign: 'top', wrap: true, fit: 'shrink', lineSpacingMultiple: 1.35,
  });
}

// ════════════════════════════════════════════════════════════════════════
// 6. AI 뉴스 요약
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, 'AI 뉴스 요약 — Claude AI가 도와드립니다', '04', '5B21B6');

  // 왼쪽: AI 역할 카드들
  const lW = 5.80;
  const lStartY = L.Y0 + 0.10;
  const lCards = [
    { icon: '📝', title: '3줄 요약', desc: '긴 기사를 읽지 않아도\n핵심 내용을 3줄로 파악할 수 있습니다.', bg: 'F5F3FF', bdr: 'C4B5FD' },
    { icon: '🏷️', title: '카테고리 자동 분류', desc: '생명보험 / 손해보험 / 제도·규제 / 상품 / 기타\n5가지 카테고리로 자동 분류해 드립니다.', bg: 'EFF6FF', bdr: 'BFDBFE' },
    { icon: '🔗', title: '관련 기사 묶기', desc: '비슷한 주제를 다룬 기사들을 자동으로 묶어\n관련 기사를 함께 확인할 수 있습니다.', bg: C.greenBg, bdr: 'A7F3D0' },
  ];
  const lCardH = calcCardH(lStartY, lCards.length, 0.12);
  lCards.forEach((lc, i) => {
    const ly = lStartY + i * (lCardH + 0.12);
    addIconCard(s, { x: L.XL, y: ly, w: lW, h: lCardH, icon: lc.icon, title: lc.title, desc: lc.desc, bgColor: lc.bg, borderColor: lc.bdr, titleSize: 18, descSize: 15 });
  });

  // 오른쪽: 실제 요약 예시
  const rX = L.XL + lW + 0.28;
  const rW = L.W - lW - 0.28;

  s.addShape('rect', { x: rX, y: L.Y0 + 0.10, w: rW, h: L.YB - L.Y0 - 0.15, fill: { color: 'FAFAFA' }, line: { color: C.bdr, width: 0.75 } });
  // 예시 레이블
  s.addShape('rect', { x: rX, y: L.Y0 + 0.10, w: rW, h: 0.40, fill: { color: '5B21B6' }, line: { color: '5B21B6' } });
  s.addText('💬  AI 요약 예시', { x: rX + 0.15, y: L.Y0 + 0.10, w: rW - 0.30, h: 0.40, fontSize: 14, bold: true, color: C.white, fontFace: F, valign: 'middle' });

  // 기사 카드 예시
  const cY = L.Y0 + 0.58;
  s.addShape('rect', { x: rX + 0.12, y: cY, w: rW - 0.24, h: 0.28, fill: { color: 'DBEAFE' }, line: { color: '93C5FD' }, rounding: 0.05 });
  s.addText('손해보험', { x: rX + 0.12, y: cY, w: 1.10, h: 0.28, fontSize: 11, color: C.navy, fontFace: F, align: 'center', valign: 'middle', bold: true });

  s.addText('삼성화재, 실손보험 보험료 8% 인상 검토', {
    x: rX + 0.12, y: cY + 0.34, w: rW - 0.24, h: 0.50,
    fontSize: 14, bold: true, color: C.black, fontFace: F, wrap: true, fit: 'shrink',
  });

  // 구분선
  s.addShape('line', { x: rX + 0.12, y: cY + 0.92, w: rW - 0.24, h: 0, line: { color: C.bdr, width: 0.5 } });

  s.addText('🤖  AI 요약 (3줄)', { x: rX + 0.12, y: cY + 1.00, w: rW - 0.24, h: 0.30, fontSize: 13, bold: true, color: '5B21B6', fontFace: F });

  const summLines = [
    '삼성화재, 2026년 실손보험료 최대 8% 인상 방침 결정',
    '고령화 심화 및 의료비 청구 증가로 손해율 악화 원인',
    '금감원 승인 후 4월부터 순차 적용 예정',
  ];
  summLines.forEach((line, i) => {
    s.addText(`• ${line}`, {
      x: rX + 0.12, y: cY + 1.36 + i * 0.44, w: rW - 0.24, h: 0.40,
      fontSize: 12, color: C.sub, fontFace: F, wrap: true, fit: 'shrink', lineSpacingMultiple: 1.25,
    });
  });

  // 출처 링크
  s.addText('📎 원본 기사 보러가기 →', { x: rX + 0.12, y: cY + 2.72, w: rW - 0.24, h: 0.30, fontSize: 12, color: C.blue, fontFace: F });

  // 관련 기사
  s.addShape('line', { x: rX + 0.12, y: cY + 3.08, w: rW - 0.24, h: 0, line: { color: C.bdr, width: 0.5 } });
  s.addText('🔗  관련 기사', { x: rX + 0.12, y: cY + 3.14, w: rW - 0.24, h: 0.28, fontSize: 12, bold: true, color: C.gray, fontFace: F });
  ['현대해상, 보험료 인상 동반 검토 중', 'DB손보 실손 손해율 120% 돌파'].forEach((t, i) => {
    s.addText(`• ${t}`, { x: rX + 0.12, y: cY + 3.46 + i * 0.34, w: rW - 0.24, h: 0.30, fontSize: 11, color: C.blue, fontFace: F, wrap: true, fit: 'shrink' });
  });
}

// ════════════════════════════════════════════════════════════════════════
// 7. 화면 구성
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '화면 구성 — 메인 화면 안내', '05', C.navy);

  // 왼쪽 화면 목업
  const mX = L.XL;
  const mY = L.Y0 + 0.08;
  const mW = 6.80;
  const mH = L.YB - mY - 0.05;

  s.addShape('rect', { x: mX, y: mY, w: mW, h: mH, fill: { color: C.white }, line: { color: 'CBD5E1', width: 1.0 } });

  // ① 상단 헤더
  s.addShape('rect', { x: mX, y: mY, w: mW, h: 0.44, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText('📰 보험 뉴스 대시보드                ☀/🌙', { x: mX + 0.10, y: mY, w: mW - 0.20, h: 0.44, fontSize: 10, color: C.white, fontFace: F, valign: 'middle' });

  // ② 사이드바
  s.addShape('rect', { x: mX, y: mY + 0.44, w: 1.55, h: mH - 0.44, fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1', width: 0.5 } });
  s.addText('📅 날짜 선택', { x: mX + 0.08, y: mY + 0.50, w: 1.38, h: 0.28, fontSize: 9, bold: true, color: C.navy, fontFace: F });
  ['4월 7일 ●', '4월 6일', '4월 5일', '─ 3월 ─', '3월 31일', '3월 30일'].forEach((d, i) => {
    s.addShape('rect', { x: mX + 0.06, y: mY + 0.84 + i * 0.46, w: 1.42, h: 0.38, fill: { color: i === 0 ? C.navy : C.white }, line: { color: C.bdr, width: 0.3 }, rounding: 0.04 });
    s.addText(d, { x: mX + 0.10, y: mY + 0.86 + i * 0.46, w: 1.34, h: 0.34, fontSize: 8, color: i === 0 ? C.white : C.sub, fontFace: F, valign: 'middle' });
  });

  // ③ 메인 콘텐츠
  const cX = mX + 1.55;
  const cW = mW - 1.55;

  // 에디션 탭
  s.addShape('rect', { x: cX, y: mY + 0.44, w: cW, h: 0.38, fill: { color: 'F8FAFC' }, line: { color: C.bdr, width: 0.3 } });
  s.addShape('rect', { x: cX + 0.06, y: mY + 0.50, w: 1.35, h: 0.26, fill: { color: C.white }, line: { color: C.navy, width: 0.5 }, rounding: 0.04 });
  s.addText('08:00 에디션', { x: cX + 0.06, y: mY + 0.50, w: 1.35, h: 0.26, fontSize: 8, color: C.navy, fontFace: F, align: 'center', valign: 'middle', bold: true });
  s.addText('14:00 에디션', { x: cX + 1.50, y: mY + 0.50, w: 1.35, h: 0.26, fontSize: 8, color: C.gray, fontFace: F, align: 'center', valign: 'middle' });

  // 카테고리 필터
  s.addShape('rect', { x: cX, y: mY + 0.82, w: cW, h: 0.28, fill: { color: C.white }, line: { color: C.bdr, width: 0.3 } });
  ['전체', '생명보험', '손해보험', '규제', '상품'].forEach((cat, i) => {
    const bg = i === 0 ? C.navy : C.white;
    const tc = i === 0 ? C.white : C.gray;
    s.addShape('rect', { x: cX + 0.06 + i * 0.82, y: mY + 0.85, w: 0.74, h: 0.22, fill: { color: bg }, line: { color: C.bdr, width: 0.3 }, rounding: 0.04 });
    s.addText(cat, { x: cX + 0.06 + i * 0.82, y: mY + 0.85, w: 0.74, h: 0.22, fontSize: 7, color: tc, fontFace: F, align: 'center', valign: 'middle' });
  });

  // 카드 2×2 미니
  const cardMiniW = (cW - 0.18) / 2;
  const cardMiniH = 0.96;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const cx2 = cX + 0.06 + col * (cardMiniW + 0.06);
      const cy2 = mY + 1.18 + row * (cardMiniH + 0.06);
      s.addShape('rect', { x: cx2, y: cy2, w: cardMiniW, h: cardMiniH, fill: { color: C.lite }, line: { color: C.bdr, width: 0.5 } });
      s.addText('기사 제목 표시', { x: cx2 + 0.05, y: cy2 + 0.04, w: cardMiniW - 0.10, h: 0.22, fontSize: 7, bold: true, color: C.black, fontFace: F });
      s.addText('• 요약 1줄\n• 요약 2줄\n• 요약 3줄', { x: cx2 + 0.05, y: cy2 + 0.28, w: cardMiniW - 0.10, h: 0.64, fontSize: 6, color: C.gray, fontFace: F, wrap: true });
    }
  }

  // 검색 영역
  s.addShape('rect', { x: cX, y: mY + 3.26, w: cW, h: 0.48, fill: { color: 'FFFBEB' }, line: { color: 'FCD34D', width: 0.5 } });
  s.addText('🔍 보험 뉴스 직접 검색 [ 키워드 입력 ] [검색]', { x: cX + 0.08, y: mY + 3.26, w: cW - 0.16, h: 0.48, fontSize: 8, color: '92400E', fontFace: F, valign: 'middle' });

  // 번호 레이블 (화살표 포함)
  const labels = [
    { n: '①', y: mY + 0.18, label: '상단 헤더 & 테마 전환' },
    { n: '②', y: mY + 1.20, label: '날짜 선택 사이드바' },
    { n: '③', y: mY + 0.62, label: '에디션 탭 (오전/오후)' },
    { n: '④', y: mY + 0.95, label: '카테고리 필터' },
    { n: '⑤', y: mY + 2.00, label: '기사 카드 목록' },
    { n: '⑥', y: mY + 3.38, label: '직접 검색 영역' },
  ];

  // 오른쪽 설명
  const rX4 = mX + mW + 0.28;
  const rW4 = L.XR - rX4;
  const rStartY4 = L.Y0 + 0.10;
  const rCards4 = [
    { icon: '①', title: '상단 헤더', desc: '앱 이름 표시 · 라이트/다크 테마 전환 버튼', bg: 'F8FAFC' },
    { icon: '②', title: '날짜 사이드바', desc: '날짜 목록에서 원하는 날짜 선택\n최근 날짜는 상단, 지난 날짜는 월별로 모아서 표시', bg: 'EFF6FF' },
    { icon: '③', title: '에디션 탭', desc: '오전(08:00) / 오후(14:00) 에디션 선택\n그날 데이터가 없으면 버튼이 비활성화됨', bg: 'F0F9FF' },
    { icon: '④', title: '카테고리 필터', desc: '원하는 분야만 모아서 보기\n생명보험 · 손해보험 · 규제 · 상품 · 기타', bg: 'ECFDF5' },
    { icon: '⑤', title: '기사 카드', desc: '수집된 기사를 카드 형태로 표시\nAI 요약 3줄 · 관련 기사 건수 포함', bg: 'FFF7ED' },
    { icon: '⑥', title: '직접 검색', desc: '카드 목록 아래에 위치\n키워드 입력 후 검색 버튼 클릭', bg: 'FDF4FF' },
  ];

  const rcH = calcCardH(rStartY4, rCards4.length, 0.06);
  rCards4.forEach((rc, i) => {
    const ry = rStartY4 + i * (rcH + 0.06);
    s.addShape('rect', { x: rX4, y: ry, w: rW4, h: rcH, fill: { color: rc.bg }, line: { color: C.bdr, width: 0.5 } });
    s.addText(`${rc.icon}  ${rc.title}`, { x: rX4 + 0.10, y: ry + 0.06, w: rW4 - 0.20, h: rcH * 0.44, fontSize: 14, bold: true, color: C.navy, fontFace: F, fit: 'shrink' });
    s.addText(rc.desc, { x: rX4 + 0.10, y: ry + rcH * 0.46, w: rW4 - 0.20, h: rcH * 0.50, fontSize: 12, color: C.sub, fontFace: F, wrap: true, fit: 'shrink' });
    assertInBounds(ry, rcH, rc.title);
  });
}

// ════════════════════════════════════════════════════════════════════════
// 8. 기사 상세 보기 (슬라이드 패널)
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '기사 상세 보기 — 클릭 한 번으로 확인', '06', C.teal);

  // 좌측 설명
  const lX = L.XL;
  const lW2 = 4.80;

  const expCards = [
    { icon: '🖱️', title: '어떻게 여나요?', desc: '기사 카드를 클릭하면\n오른쪽 또는 하단에서\n상세 패널이 부드럽게 열립니다.', bg: C.tealBg, bdr: '7DD3FC' },
    { icon: '📱', title: '스마트폰에서는?', desc: '화면 하단에서 위로 올라오는\n시트 형태로 표시됩니다.\n모바일에서도 편리하게 이용 가능합니다.', bg: C.greenBg, bdr: 'A7F3D0' },
    { icon: '📋', title: '패널에서 볼 수 있는 것', desc: '• AI 3줄 요약\n• 기사 카테고리 배지\n• 원본 기사 링크\n• 비슷한 주제 관련 기사 (최대 2건)', bg: C.skyBg, bdr: 'BFDBFE' },
  ];
  const lcH2 = calcCardH(L.Y0 + 0.10, expCards.length, 0.12);
  expCards.forEach((ec, i) => {
    const ly2 = L.Y0 + 0.10 + i * (lcH2 + 0.12);
    addIconCard(s, { x: lX, y: ly2, w: lW2, h: lcH2, icon: ec.icon, title: ec.title, desc: ec.desc, bgColor: ec.bg, borderColor: ec.bdr, titleSize: 17, descSize: 14 });
  });

  // 우측: 패널 목업
  const pX2 = L.XL + lW2 + 0.28;
  const pW2 = L.XR - pX2;
  const pY2 = L.Y0 + 0.10;
  const pH2 = L.YB - pY2 - 0.05;

  s.addShape('rect', { x: pX2, y: pY2, w: pW2, h: pH2, fill: { color: C.white }, line: { color: 'CBD5E1', width: 1.0 } });
  // 패널 헤더
  s.addShape('rect', { x: pX2, y: pY2, w: pW2, h: 0.46, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText('기사 상세 보기                        ✕ 닫기', { x: pX2 + 0.12, y: pY2, w: pW2 - 0.24, h: 0.46, fontSize: 13, bold: true, color: C.white, fontFace: F, valign: 'middle' });

  // 카테고리 배지
  s.addShape('rect', { x: pX2 + 0.15, y: pY2 + 0.56, w: 1.15, h: 0.30, fill: { color: 'DBEAFE' }, line: { color: '93C5FD' }, rounding: 0.08 });
  s.addText('손해보험', { x: pX2 + 0.15, y: pY2 + 0.56, w: 1.15, h: 0.30, fontSize: 11, color: C.navy, fontFace: F, align: 'center', valign: 'middle', bold: true });

  // 제목
  s.addText('삼성화재, 실손보험 보험료 8% 인상 검토 중', {
    x: pX2 + 0.15, y: pY2 + 0.94, w: pW2 - 0.30, h: 0.58,
    fontSize: 14, bold: true, color: C.black, fontFace: F, wrap: true, fit: 'shrink',
  });

  // 날짜 출처
  s.addText('조선비즈  |  2026-04-07  14:00 에디션', {
    x: pX2 + 0.15, y: pY2 + 1.58, w: pW2 - 0.30, h: 0.26, fontSize: 11, color: C.gray, fontFace: F,
  });

  s.addShape('line', { x: pX2 + 0.15, y: pY2 + 1.92, w: pW2 - 0.30, h: 0, line: { color: C.bdr, width: 0.5 } });

  // AI 요약 섹션
  s.addText('🤖  AI 핵심 요약', { x: pX2 + 0.15, y: pY2 + 2.00, w: pW2 - 0.30, h: 0.30, fontSize: 13, bold: true, color: '5B21B6', fontFace: F });

  const lines2 = [
    '삼성화재, 2026년 실손보험료 최대 8% 인상 결정',
    '고령화 심화·의료비 청구 급증으로 손해율 악화',
    '금감원 승인 후 4월부터 순차 적용 예정',
  ];
  lines2.forEach((line, i) => {
    s.addText(`• ${line}`, { x: pX2 + 0.15, y: pY2 + 2.36 + i * 0.40, w: pW2 - 0.30, h: 0.36, fontSize: 12, color: C.sub, fontFace: F, wrap: true, fit: 'shrink' });
  });

  s.addShape('rect', { x: pX2 + 0.15, y: pY2 + 3.62, w: pW2 - 0.30, h: 0.36, fill: { color: C.skyBg }, line: { color: 'BFDBFE' }, rounding: 0.06 });
  s.addText('📎  원본 기사 전문 보기 →', { x: pX2 + 0.20, y: pY2 + 3.62, w: pW2 - 0.40, h: 0.36, fontSize: 12, color: C.blue, fontFace: F, valign: 'middle' });

  s.addShape('line', { x: pX2 + 0.15, y: pY2 + 4.08, w: pW2 - 0.30, h: 0, line: { color: C.bdr, width: 0.5 } });
  s.addText('🔗  비슷한 주제 관련 기사', { x: pX2 + 0.15, y: pY2 + 4.14, w: pW2 - 0.30, h: 0.28, fontSize: 12, bold: true, color: C.gray, fontFace: F });
  ['현대해상, 보험료 인상 동반 검토', 'DB손보 실손 손해율 120% 초과'].forEach((t, i) => {
    s.addShape('rect', { x: pX2 + 0.15, y: pY2 + 4.48 + i * 0.44, w: pW2 - 0.30, h: 0.38, fill: { color: C.lite }, line: { color: C.bdr } });
    s.addText(`→ ${t}`, { x: pX2 + 0.25, y: pY2 + 4.50 + i * 0.44, w: pW2 - 0.45, h: 0.34, fontSize: 11, color: C.blue, fontFace: F, valign: 'middle', fit: 'shrink' });
  });
}

// ════════════════════════════════════════════════════════════════════════
// 9. 직접 검색
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '직접 검색 — 원하는 뉴스를 바로 찾기', '07', '92400E');

  // 오른쪽: 검색 UI 목업
  const mX5 = L.XL + 5.20;
  const mW5 = L.XR - mX5;
  const mY5 = L.Y0 + 0.10;
  const mH5 = L.YB - mY5 - 0.05;

  s.addShape('rect', { x: mX5, y: mY5, w: mW5, h: mH5, fill: { color: 'FFFBEB' }, line: { color: 'FCD34D', width: 0.75 } });
  s.addShape('rect', { x: mX5, y: mY5, w: mW5, h: 0.42, fill: { color: 'D97706' }, line: { color: 'D97706' } });
  s.addText('🔍  보험 뉴스 직접 검색', { x: mX5 + 0.12, y: mY5, w: mW5 - 0.24, h: 0.42, fontSize: 13, bold: true, color: C.white, fontFace: F, valign: 'middle' });

  // 검색 입력창
  s.addShape('rect', { x: mX5 + 0.12, y: mY5 + 0.52, w: mW5 - 1.10, h: 0.46, fill: { color: C.white }, line: { color: 'FCD34D', width: 0.75 } });
  s.addText('실손보험', { x: mX5 + 0.22, y: mY5 + 0.52, w: mW5 - 1.20, h: 0.46, fontSize: 13, color: C.black, fontFace: F, valign: 'middle' });
  s.addShape('rect', { x: mX5 + mW5 - 0.94, y: mY5 + 0.52, w: 0.82, h: 0.46, fill: { color: 'D97706' }, line: { color: 'D97706' } });
  s.addText('검색', { x: mX5 + mW5 - 0.94, y: mY5 + 0.52, w: 0.82, h: 0.46, fontSize: 13, bold: true, color: C.white, fontFace: F, align: 'center', valign: 'middle' });

  s.addShape('line', { x: mX5 + 0.12, y: mY5 + 1.08, w: mW5 - 0.24, h: 0, line: { color: 'FCD34D', width: 0.5 } });
  s.addText('검색 결과 (4건)', { x: mX5 + 0.12, y: mY5 + 1.14, w: mW5 - 0.24, h: 0.28, fontSize: 12, bold: true, color: '92400E', fontFace: F });

  const results2 = [
    '실손보험 보험료 8% 인상 확정... 4월부터',
    '실손보험 청구 간소화 법안 통과',
    '金감원, 실손보험 과잉진료 단속 강화',
    '4세대 실손보험 가입자 25만 명 돌파',
  ];
  results2.forEach((r, i) => {
    s.addShape('rect', { x: mX5 + 0.12, y: mY5 + 1.48 + i * 0.62, w: mW5 - 0.24, h: 0.54, fill: { color: C.white }, line: { color: 'FCD34D', width: 0.3 } });
    s.addText(`🔗 ${r}`, { x: mX5 + 0.20, y: mY5 + 1.54 + i * 0.62, w: mW5 - 0.40, h: 0.24, fontSize: 11, color: C.blue, fontFace: F, fit: 'shrink' });
    s.addText('기사 앞부분 요약 내용이 여기에 표시됩니다...', { x: mX5 + 0.20, y: mY5 + 1.80 + i * 0.62, w: mW5 - 0.40, h: 0.18, fontSize: 9, color: C.gray, fontFace: F, fit: 'shrink' });
  });

  // 왼쪽: 설명 카드들
  const lX5 = L.XL;
  const lW5 = 4.96;
  const lStartY5 = L.Y0 + 0.10;

  const expItems = [
    { icon: '✏️', title: '사용법이 간단합니다', desc: '검색창에 원하는 키워드를 입력하고\n[검색] 버튼을 누르면 끝!\n별도 가입이나 로그인이 필요 없습니다.', bg: C.amberBg, bdr: 'FCD34D' },
    { icon: '⚡', title: '실시간으로 검색됩니다', desc: '자동 수집과 별개로\n현재 시점의 최신 뉴스를 즉시 검색합니다.\n자동 수집 목록에 없는 뉴스도 찾을 수 있습니다.', bg: C.skyBg, bdr: 'BFDBFE' },
    { icon: '📋', title: '검색 결과 표시 방식', desc: '• 기사 제목 (클릭 시 원문으로 이동)\n• 기사 앞부분 내용 미리보기\n• AI 요약은 제공되지 않습니다\n  (자동 수집 기사만 AI 요약 제공)', bg: C.greenBg, bdr: 'A7F3D0' },
  ];
  const lCardH5 = calcCardH(lStartY5, expItems.length, 0.12);
  expItems.forEach((ei, i) => {
    const ly5 = lStartY5 + i * (lCardH5 + 0.12);
    addIconCard(s, { x: lX5, y: ly5, w: lW5, h: lCardH5, icon: ei.icon, title: ei.title, desc: ei.desc, bgColor: ei.bg, borderColor: ei.bdr, titleSize: 17, descSize: 14 });
  });
}

// ════════════════════════════════════════════════════════════════════════
// 10. 이용 방법 (단계별 가이드)
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '이용 방법 — 5단계로 시작하기', '08', C.green);

  const steps2 = [
    {
      n: '1',
      icon: '📅',
      title: '날짜 선택',
      desc: '왼쪽 사이드바에서\n보고 싶은 날짜를 클릭합니다.\n최근 날짜는 상단에, 지난 날짜는\n월별로 펼쳐서 볼 수 있습니다.',
      color: C.navy,
      bg: C.skyBg, bdr: 'BFDBFE',
    },
    {
      n: '2',
      icon: '🕐',
      title: '에디션 선택',
      desc: '오전(08:00) 또는 오후(14:00)\n에디션 탭을 선택합니다.\n그날 수집이 완료된 에디션만\n클릭할 수 있습니다.',
      color: C.teal,
      bg: C.tealBg, bdr: '7DD3FC',
    },
    {
      n: '3',
      icon: '🏷️',
      title: '카테고리 선택',
      desc: '관심 있는 분야만 모아보고 싶다면\n상단 카테고리 버튼을 클릭하세요.\n[전체]를 선택하면 모든 기사를\n한꺼번에 볼 수 있습니다.',
      color: C.green,
      bg: C.greenBg, bdr: 'A7F3D0',
    },
    {
      n: '4',
      icon: '🃏',
      title: '기사 카드 클릭',
      desc: '관심 있는 기사 카드를 클릭하면\n오른쪽에 상세 패널이 열립니다.\nAI 요약 3줄과 관련 기사를\n한눈에 확인할 수 있습니다.',
      color: '5B21B6',
      bg: 'F5F3FF', bdr: 'C4B5FD',
    },
    {
      n: '5',
      icon: '🔍',
      title: '직접 검색',
      desc: '자동 수집 외에\n특정 키워드가 궁금하다면\n페이지 하단 검색창을 이용하세요.\n원하는 뉴스를 바로 찾을 수 있습니다.',
      color: C.amber,
      bg: C.amberBg, bdr: 'FCD34D',
    },
  ];

  // 상단 3개, 하단 2개
  const cardStartY2 = L.Y0 + 0.08;
  const ROW_GAP2 = 0.12;

  // 행 1: 3개
  const colW1 = (L.W - 0.20 * 2) / 3;
  // 행 2: 2개
  const colW2b = (L.W - 0.20) / 2;
  const cardH2 = calcCardH(cardStartY2, 2, ROW_GAP2);

  for (let i = 0; i < 3; i++) {
    const st = steps2[i];
    const x = L.XL + i * (colW1 + 0.20);
    const y = cardStartY2;
    s.addShape('rect', { x, y, w: colW1, h: cardH2, fill: { color: st.bg }, line: { color: st.bdr, width: 0.75 } });
    // 스텝 번호
    s.addShape('ellipse', { x: x + 0.14, y: y + 0.12, w: 0.48, h: 0.48, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.n, { x: x + 0.14, y: y + 0.12, w: 0.48, h: 0.48, fontSize: 18, bold: true, color: C.white, fontFace: F, align: 'center', valign: 'middle' });
    s.addText(`${st.icon} ${st.title}`, { x: x + 0.74, y: y + 0.15, w: colW1 - 0.86, h: 0.46, fontSize: 16, bold: true, color: st.color, fontFace: F, fit: 'shrink' });
    s.addText(st.desc, { x: x + 0.14, y: y + 0.68, w: colW1 - 0.28, h: cardH2 - 0.80, fontSize: 13, color: C.sub, fontFace: F, wrap: true, fit: 'shrink', lineSpacingMultiple: 1.30 });
    assertInBounds(y, cardH2, st.title);
  }

  for (let i = 0; i < 2; i++) {
    const st = steps2[3 + i];
    const x = L.XL + i * (colW2b + 0.20);
    const y = cardStartY2 + cardH2 + ROW_GAP2;
    s.addShape('rect', { x, y, w: colW2b, h: cardH2, fill: { color: st.bg }, line: { color: st.bdr, width: 0.75 } });
    s.addShape('ellipse', { x: x + 0.14, y: y + 0.12, w: 0.48, h: 0.48, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.n, { x: x + 0.14, y: y + 0.12, w: 0.48, h: 0.48, fontSize: 18, bold: true, color: C.white, fontFace: F, align: 'center', valign: 'middle' });
    s.addText(`${st.icon} ${st.title}`, { x: x + 0.74, y: y + 0.15, w: colW2b - 0.86, h: 0.46, fontSize: 16, bold: true, color: st.color, fontFace: F, fit: 'shrink' });
    s.addText(st.desc, { x: x + 0.14, y: y + 0.68, w: colW2b - 0.28, h: cardH2 - 0.80, fontSize: 13, color: C.sub, fontFace: F, wrap: true, fit: 'shrink', lineSpacingMultiple: 1.30 });
    assertInBounds(y, cardH2, st.title);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 11. 자주 묻는 질문 (FAQ) / 활용 팁
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, '활용 팁 & 자주 묻는 질문', '09', '5B21B6');

  const faqs = [
    { q: '뉴스가 보이지 않아요', a: '해당 날짜/에디션에 아직 수집이 완료되지 않았을 수 있습니다.\n다음 수집 시간(오전 8시 / 오후 2시) 이후에 다시 확인해 보세요.' },
    { q: 'AI 요약이 "요약 준비 중"으로 표시돼요', a: 'AI가 요약을 처리하는 중입니다.\n다음 수집 에디션에서는 정상적으로 표시됩니다.' },
    { q: '직접 검색과 자동 수집의 차이가 뭔가요?', a: '자동 수집 기사: AI 요약 + 관련 기사 묶음 + 상세 패널 제공\n직접 검색 기사: 기사 제목·앞부분만 표시 (AI 요약 없음)' },
    { q: '다크/라이트 모드는 어디서 바꾸나요?', a: '화면 오른쪽 상단의 ☀/🌙 아이콘을 클릭하세요.\n선택한 테마는 다음 방문 때도 유지됩니다.' },
    { q: '기사를 클릭해도 패널이 안 열려요', a: '자동 수집된 기사만 상세 패널이 열립니다.\n직접 검색 결과는 기사 제목 클릭 시 원본 사이트로 이동합니다.' },
    { q: '더 많은 기사를 보고 싶어요', a: '사이드바에서 다른 날짜 / 에디션을 선택하거나\n하단 직접 검색 기능으로 키워드 검색을 이용해 보세요.' },
  ];

  const COL_GAP5 = 0.20;
  const colW5 = (L.W - COL_GAP5) / 2;
  const ROW_GAP5 = 0.10;
  const rows5 = Math.ceil(faqs.length / 2);
  const cardStartY5 = L.Y0 + 0.08;
  const cardH5 = calcCardH(cardStartY5, rows5, ROW_GAP5);

  faqs.forEach((faq, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = L.XL + col * (colW5 + COL_GAP5);
    const y = cardStartY5 + row * (cardH5 + ROW_GAP5);

    s.addShape('rect', { x, y, w: colW5, h: cardH5, fill: { color: C.lite }, line: { color: C.bdr, width: 0.75 } });
    // Q 배지
    s.addShape('ellipse', { x: x + 0.12, y: y + 0.10, w: 0.38, h: 0.38, fill: { color: '5B21B6' }, line: { color: '5B21B6' } });
    s.addText('Q', { x: x + 0.12, y: y + 0.10, w: 0.38, h: 0.38, fontSize: 14, bold: true, color: C.white, fontFace: F, align: 'center', valign: 'middle' });
    s.addText(faq.q, { x: x + 0.58, y: y + 0.10, w: colW5 - 0.70, h: cardH5 * 0.38, fontSize: 15, bold: true, color: C.navy, fontFace: F, valign: 'middle', fit: 'shrink', wrap: true });
    // A
    s.addShape('line', { x: x + 0.12, y: y + 0.10 + cardH5 * 0.42, w: colW5 - 0.24, h: 0, line: { color: C.bdr, width: 0.5 } });
    s.addText(faq.a, {
      x: x + 0.12, y: y + 0.10 + cardH5 * 0.46, w: colW5 - 0.24, h: cardH5 - 0.10 - cardH5 * 0.46 - 0.08,
      fontSize: 13, color: C.sub, fontFace: F, wrap: true, fit: 'shrink', lineSpacingMultiple: 1.30,
    });
    assertInBounds(y, cardH5, faq.q);
  });
}

// ════════════════════════════════════════════════════════════════════════
// 12. 마무리
// ════════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: SLIDE.W, h: SLIDE.H, fill: { color: C.navy }, line: { color: C.navy } });
  s.addShape('rect', { x: 0, y: 5.00, w: SLIDE.W, h: 2.50, fill: { color: '0F2544' }, line: { color: '0F2544' } });

  s.addText('이제 보험 뉴스,\n직접 찾지 않아도 됩니다', {
    x: 1.0, y: 1.00, w: 11.33, h: 1.80,
    fontSize: 42, bold: true, color: C.white, fontFace: F,
    align: 'center', valign: 'middle', fit: 'shrink',
  });
  s.addText('매일 자동 수집 · AI 핵심 요약 · 원하는 키워드 검색까지', {
    x: 1.0, y: 3.00, w: 11.33, h: 0.52,
    fontSize: 18, color: '94C3E0', fontFace: F, align: 'center',
  });

  // 정리 카드 3개
  const sumCards = [
    { icon: '⏰', label: '하루 2회', sub: '자동 수집' },
    { icon: '🤖', label: 'AI 3줄', sub: '핵심 요약' },
    { icon: '🔍', label: '실시간', sub: '직접 검색' },
  ];
  const scW = 3.40, scGap = 0.32;
  const totalSW = sumCards.length * scW + (sumCards.length - 1) * scGap;
  let scX = (SLIDE.W - totalSW) / 2;
  for (const sc of sumCards) {
    s.addShape('rect', { x: scX, y: 3.72, w: scW, h: 0.96, fill: { color: '1D4ED8' }, line: { color: '3B82F6', width: 0.5 }, rounding: 0.12 });
    s.addText(sc.icon, { x: scX, y: 3.76, w: scW, h: 0.40, fontSize: 24, fontFace: F, align: 'center' });
    s.addText(`${sc.label}  ${sc.sub}`, { x: scX, y: 4.18, w: scW, h: 0.44, fontSize: 15, bold: true, color: C.white, fontFace: F, align: 'center', valign: 'middle' });
    scX += scW + scGap;
  }

  s.addText('Made with Claude Code + 바이브코딩랩', {
    x: 0, y: 5.26, w: SLIDE.W, h: 0.36, fontSize: 14, color: '7DA3C8', fontFace: F, align: 'center',
  });
  s.addText('vibecodinglab.ai.kr', {
    x: 0, y: 5.66, w: SLIDE.W, h: 0.32, fontSize: 14, color: C.teal, fontFace: F, align: 'center', bold: true,
  });
}

// ─── 출력 ────────────────────────────────────────────────────────────────
const outputPath = resolveOutputPath(ROOT, 'InsuranceNewsDashboard');
await pptx.writeFile({ fileName: outputPath });
console.log(`✅ PPT 저장 완료: ${outputPath}`);
