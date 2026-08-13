const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');

test('number selections accept ranges, reverse ranges, duplicates, and bounds', () => {
  assert.deepEqual(core.parseNumberSelection('1, 3-5, 5, 8-7, 0, 10, bad', 1, 9), [1,3,4,5,7,8]);
});

test('Cambridge URLs are deterministic', () => {
  const base = 'https://example.test/upload/';
  assert.equal(core.caiePaperUrl(base, '9700', 's', 2023, 'qp', '21'), `${base}9700_s23_qp_21.pdf`);
  assert.equal(core.caieThresholdUrl(base, '9700', 's', 2023), `${base}9700_s23_gt.pdf`);
});

test('paper parser handles remote URLs and local filenames', () => {
  const subjects = { '9700':'Biology' };
  const remote = core.parsePaperReference('https://host.test/9700_s23_qp_21.pdf', subjects);
  const local = core.parsePaperReference('9700_s23_ms_21.pdf', subjects);
  assert.equal(remote.key, '9700_s23_21');
  assert.equal(remote.type, 'qp');
  assert.equal(remote.subjectCode, '9700');
  assert.equal(remote.component, '21');
  assert.equal(local.key, remote.key);
  assert.equal(local.type, 'ms');
  assert.equal(core.parsePaperReference('javascript:alert(1)', subjects), null);
  assert.equal(core.parsePaperReference('not-a-paper.pdf', subjects), null);
});

test('grade columns preserve A-G and sort numeric grades from 9 to 1', () => {
  assert.deepEqual(core.thresholdGrades({ grades:{ 1:11, 9:37, 5:24, 8:35, 2:14, 7:33, 3:17, 6:28, 4:20 } }), ['9','8','7','6','5','4','3','2','1']);
  assert.deepEqual(core.thresholdGrades({ grades:{ G:11, A:33, C:20, B:26, F:13, E:15, D:17 } }), ['A','B','C','D','E','F','G']);
});

test('legacy thresholds normalize without changing values', () => {
  assert.deepEqual(core.normalizeThresholdRow({ sess:'MJ 2023', v:'21', max:60, A:39, B:34, C:28, D:20, E:14 }), {
    sess:'MJ 2023', v:'21', max:60, grades:{ A:39, B:34, C:28, D:20, E:14 }
  });
});

test('page impact is transparent, rounded, and never reports negative savings', () => {
  assert.deepEqual(core.calculatePageImpact(14, 9), {
    sourcePages:14, outputPages:9, pagesSaved:5, savingsPct:35.7
  });
  assert.deepEqual(core.calculatePageImpact(4, 6), {
    sourcePages:4, outputPages:6, pagesSaved:0, savingsPct:0
  });
});

test('two-up MS layout keeps landscape pages large on portrait A4', () => {
  const layout = core.chooseTwoUpLayout([{ width:1750, height:1237 }, { width:1750, height:1237 }]);
  assert.equal(layout.orientation, 'portrait');
  assert.equal(layout.pageW, 595);
  assert.ok(layout.slots[0].y > layout.slots[1].y);
});

test('two-up MS layout keeps portrait pages large on landscape A4', () => {
  const layout = core.chooseTwoUpLayout([{ width:1750, height:2475 }, { width:1750, height:2475 }]);
  assert.equal(layout.orientation, 'landscape');
  assert.equal(layout.pageW, 842);
  assert.ok(layout.slots[0].x < layout.slots[1].x);
});

test('mixed MS orientations choose the layout with the stronger minimum scale', () => {
  const layout = core.chooseTwoUpLayout([{ width:1750, height:1237 }, { width:1750, height:2475 }]);
  assert.equal(layout.orientation, 'landscape');
});
