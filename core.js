(function attachTeraCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TeraCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTeraCore() {
  'use strict';

  function parseNumberSelection(value, min, max) {
    const result = new Set();
    String(value).split(',').map(item => item.trim()).filter(Boolean).forEach(token => {
      const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const a = Number(range[1]);
        const b = Number(range[2]);
        for (let number = Math.min(a, b); number <= Math.max(a, b); number++) {
          if (number >= min && number <= max) result.add(number);
        }
      } else if (/^\d+$/.test(token)) {
        const number = Number(token);
        if (number >= min && number <= max) result.add(number);
      }
    });
    return [...result].sort((a, b) => a - b);
  }

  function caiePaperUrl(base, code, session, year, type, component) {
    return `${base}${code}_${session}${String(year).slice(-2)}_${type}_${component}.pdf`;
  }

  function caieThresholdUrl(base, code, session, year) {
    return `${base}${code}_${session}${String(year).slice(-2)}_gt.pdf`;
  }

  function parsePaperReference(value, subjects = {}, sessions = { s:'MJ', w:'ON', m:'FM' }) {
    const input = String(value || '').trim();
    const filenameOnly = !/[\\/]/.test(input) && /\.pdf(?:[?#]|$)/i.test(input);
    let normalized = input;
    try {
      const parsed = new URL(filenameOnly ? `https://local.invalid/${encodeURIComponent(input)}` : input);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      if (!filenameOnly) normalized = parsed.href;
    } catch (_) {
      return null;
    }
    const match = normalized.match(/(\d{4})_(s|w|m)(\d{2})_(qp|ms)_?(\d+)/i);
    if (!match) return null;
    const [, subject, session, year, type, component] = match;
    const sessionKey = session.toLowerCase();
    const sessionLabel = sessions[sessionKey] || session.toUpperCase();
    const subjectName = subjects[subject] || `Subj ${subject}`;
    return {
      key:`${subject}_${sessionKey}${year}_${component}`,
      label:`${subjectName} ${subject} · ${sessionLabel}${year} · P${component}`,
      type:type.toLowerCase(),
      url:normalized,
      subjectCode:subject,
      session:sessionKey,
      year:2000 + Number(year),
      component,
    };
  }

  function thresholdGrades(row) {
    if (row.grades) {
      const grades = Object.keys(row.grades);
      return grades.every(grade => /^\d+$/.test(grade))
        ? grades.sort((a, b) => Number(b) - Number(a))
        : grades.sort((a, b) => 'ABCDEFG'.indexOf(a) - 'ABCDEFG'.indexOf(b));
    }
    return ['A','B','C','D','E','F','G'].filter(grade => row[grade] !== undefined);
  }

  function normalizeThresholdRow(row) {
    if (row.grades) return row;
    const grades = {};
    thresholdGrades(row).forEach(grade => { grades[grade] = row[grade]; });
    return { sess:row.sess, v:row.v, max:row.max, grades };
  }

  function calculatePageImpact(sourcePages, outputPages) {
    const source = Math.max(0, Number(sourcePages) || 0);
    const output = Math.max(0, Number(outputPages) || 0);
    const pagesSaved = Math.max(0, source - output);
    return {
      sourcePages:source,
      outputPages:output,
      pagesSaved,
      savingsPct:source ? Math.round((pagesSaved / source) * 1000) / 10 : 0,
    };
  }

  function chooseTwoUpLayout(images, options = {}) {
    const shortEdge = options.shortEdge || 595;
    const longEdge = options.longEdge || 842;
    const margin = options.margin ?? 8;
    const gap = options.gap ?? 5;
    const dimensions = images.filter(Boolean).map(image => ({
      width:Math.max(1, Number(image.width) || 1),
      height:Math.max(1, Number(image.height) || 1),
    }));
    if (!dimensions.length) throw new Error('At least one page image is required');

    const portrait = {
      orientation:'portrait', pageW:shortEdge, pageH:longEdge,
      slots:[
        { x:margin, y:margin + (longEdge - 2 * margin - gap) / 2 + gap, width:shortEdge - 2 * margin, height:(longEdge - 2 * margin - gap) / 2 },
        { x:margin, y:margin, width:shortEdge - 2 * margin, height:(longEdge - 2 * margin - gap) / 2 },
      ],
      divider:{ x1:margin, y1:longEdge / 2, x2:shortEdge - margin, y2:longEdge / 2 },
    };
    const landscape = {
      orientation:'landscape', pageW:longEdge, pageH:shortEdge,
      slots:[
        { x:margin, y:margin, width:(longEdge - 2 * margin - gap) / 2, height:shortEdge - 2 * margin },
        { x:margin + (longEdge - 2 * margin - gap) / 2 + gap, y:margin, width:(longEdge - 2 * margin - gap) / 2, height:shortEdge - 2 * margin },
      ],
      divider:{ x1:longEdge / 2, y1:margin, x2:longEdge / 2, y2:shortEdge - margin },
    };
    const score = layout => Math.min(...dimensions.map((image, index) => {
      const slot = layout.slots[Math.min(index, layout.slots.length - 1)];
      return Math.min(slot.width / image.width, slot.height / image.height);
    }));
    return score(landscape) > score(portrait) ? landscape : portrait;
  }

  return {
    caiePaperUrl,
    caieThresholdUrl,
    calculatePageImpact,
    chooseTwoUpLayout,
    normalizeThresholdRow,
    parseNumberSelection,
    parsePaperReference,
    thresholdGrades,
  };
});
