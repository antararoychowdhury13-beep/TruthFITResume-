/* TruthFit guardrails — pure functions shared by the browser app and the Node test suite.
   Bundled into index.html before app.js by scripts/build.sh. */
var TruthGuards = (function () {
  'use strict';

  /* ---------- Section headings & role lines ---------- */
  var KNOWN_HEADINGS = /^(?:(?:professional|career|executive|personal|key|core|technical|relevant|work|employment|additional|other|selected)\s+)*(?:summary|profile|about(?: me)?|objective|skills?|tools|competenc(?:y|ies)|expertise|experience|employment(?: history)?|work history|career(?: history)?|history|education|qualifications?|certifications?|licen[cs]es?|awards?|achievements|projects|languages|interests|publications|volunteering|leadership|training)(?:\s*(?:&|and)\s*[a-z ]+)?\s*:?$/i;
  function isHeading(l) {
    l = String(l).trim();
    if (l.length < 3 || l.length >= 42 || /\d/.test(l) || /^[•\-*]/.test(l)) return false;
    if (l === l.toUpperCase() && /[A-Z]/.test(l)) return true;
    return KNOWN_HEADINGS.test(l);
  }

  var MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
  var END = '(?:(?:' + MON + '\\s+)?(?:19|20)\\d\\d|present|current|now|today|date)';
  var DATE_RANGE = new RegExp('(?:' + MON + '\\s+)?(?:19|20)\\d\\d\\s*(?:[–—-]|to)\\s*' + END, 'i');
  var DATE_ONLY = new RegExp('^\\(?\\s*' + DATE_RANGE.source + '\\s*\\)?$', 'i');
  var TITLE_WORDS = /\b(designer|manager|engineer|developer|lead|leader|director|head|analyst|consultant|specialist|officer|intern|associate|architect|strategist|researcher|scientist|nurse|teacher|lecturer|accountant|administrator|coordinator|executive|assistant|founder|president|vp|chief|owner|writer|editor|producer|technician|advisor|partner|principal|supervisor)s?\b/i;

  /** Parse a job line. Returns {title, employer, dates, usesNext} or null. */
  function parseRole(line, next) {
    var l = String(line).trim();
    if (!l || /^[•\-*]/.test(l)) return null;
    var m = l.match(/^(.+?)\s+[—–-]\s+(.+?)\s*\|\s*(.+)$/);
    if (m && DATE_RANGE.test(m[3])) return { title: m[1].trim(), employer: m[2].trim(), dates: m[3].trim(), usesNext: false };
    var dates = null, head = l, usesNext = false;
    var dm = l.match(DATE_RANGE);
    if (dm) { dates = dm[0].trim(); head = l.replace(dm[0], '').replace(/[\s|,(–—-]+$/, '').replace(/\(\s*\)/, '').trim(); }
    else if (next && DATE_ONLY.test(String(next).trim())) { dates = String(next).trim().replace(/^\(|\)$/g, '').trim(); usesNext = true; }
    if (!dates || !head || head.length > 120) return null;
    var parts = head.split(/\s+[—–|]\s+|\s+-\s+|\s*\|\s*|\s+at\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length < 2) return null;
    var a = parts[0], b = parts.slice(1).join(' — ');
    if (TITLE_WORDS.test(b) && !TITLE_WORDS.test(a)) { var t = a; a = b; b = t; }
    return { title: a, employer: b, dates: dates, usesNext: usesNext };
  }

  /* ---------- Locked facts ---------- */
  function factsOf(r) {
    if (!r || !r.locked) return [];
    if (r.type === 'role') return [r.title, r.employer, r.dates].filter(Boolean);
    if (['edu', 'name', 'contact'].indexOf(r.type) > -1) return [r.text];
    return [];
  }
  /** Locked records a change would alter: a fact present in `before` but missing from `after`. */
  function lockViolations(before, after, vault) {
    before = String(before || ''); after = String(after || '');
    if (!before) return [];
    var out = [];
    (vault || []).forEach(function (r) {
      var missing = factsOf(r).filter(function (f) { return f && f.length > 1 && before.indexOf(f) > -1 && after.indexOf(f) === -1; });
      if (missing.length) out.push({ rec: r, missing: missing });
    });
    return out;
  }

  /* ---------- Grounding: words a change adds that no evidence supports ---------- */
  var ALLOW = new Set(('a an the and or but nor of in on at to for from by with without within into onto across through over under via per as than then that this these those their its it is are was were be been being has have had do does did not no so such each every both all any more most less fewer other another own same very also only just while when where which who whom whose what how why including include includes included using use used make made making new key main major core plus via role roles work worked working team teams across end via based close higher lower better faster greater strong clear clearer direct day days week weeks month months year years time times number numbers scope result results outcome outcomes impact level levels area areas part parts way ways set sets range ranges current previous multiple several various wide broad overall total full real early late first second third one two three four five six seven eight nine ten dozen hundreds thousands '
    + 'led lead leads leading manage managed manages managing ran run runs running drove drive drives driving built build builds building created create creates creating designed design designs designing delivered deliver delivers delivering launched launch launches founded introduced introduce established establish establishing oversaw oversee oversees owned own owns owning directed direct directing facilitated facilitate presented present authored applied apply applying solved solve improved improve improves improving reduced reduce reduces reducing scaled scale scaling achieved achieve achieving mentored mentor mentoring planned plan planning shipped ship developed develop developing defined define coordinated coordinate increased increase cut cuts cutting streamlined streamline negotiated partnered partner partnering raised raise raises raising lifted lift lifting grew grow growing saved save supported support supporting enabled enable enabling helped help helping provided provide providing ensured ensure ensuring worked works handled handle produced produce translated translate turned turn kept keep took take gave give used uses held hold them they him her his our we us up down out off hands'
  ).split(' '));
  var stem = function (w) { w = w.toLowerCase().replace(/['’]s$/, ''); if (w.length > 3) w = w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'); return w.length > 5 ? w.slice(0, 5) : w; };
  function stems(text) {
    var s = new Set();
    (String(text || '').match(/[A-Za-z][A-Za-z+#'’]*/g) || []).forEach(function (w) { s.add(stem(w)); });
    return s;
  }
  /** Returns {names, words}: `names` = unsupported proper nouns/credentials/tools (block);
      `words` = unsupported ordinary words (needs the user's check). */
  function unsupported(after, evidenceText) {
    var known = stems(evidenceText), names = [], words = [];
    String(after || '').split('\n').forEach(function (line) {
      var body = line.replace(/^\s*[•\-*]\s*/, '');
      var re = /[A-Za-z][A-Za-z+#'’]*/g, m, initial = true, lastEnd = 0;
      while ((m = re.exec(body))) {
        var gap = body.slice(lastEnd, m.index), w = m[0], lw = w.toLowerCase().replace(/['’]s$/, '');
        if (/[.!?:;·|]\s*$/.test(gap) || /^\s*[·|]/.test(gap)) initial = true;
        lastEnd = m.index + w.length;
        var isInitial = initial; initial = false;
        if (lw.length < 3 || ALLOW.has(lw) || known.has(stem(lw))) continue;
        var cap = /^[A-Z]/.test(w);
        if (cap && (!isInitial || /^[A-Z0-9+#]{2,}$/.test(w) || /[a-z][A-Z]/.test(w))) { if (names.indexOf(w) < 0) names.push(w); }
        else if (words.indexOf(lw) < 0) words.push(lw);
      }
    });
    return { names: names, words: words };
  }

  /* ---------- Privacy shield ---------- */
  var EMAIL_G = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  var URL_G = /\b(?:https?:\/\/|www\.)[^\s,;)]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|io|net|org|me|co|dev|app|uk|ai|design|page|site|xyz)(?:\/[^\s,;)]*)?/gi;
  var PHONE_G = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,5}\)[\s.-]?)?\d[\d\s.-]{5,}\d/g;
  function maskPhones(t) {
    return t.replace(PHONE_G, function (m) {
      var digits = m.replace(/\D/g, '');
      if (digits.length < 9) return m;
      var groups = m.match(/\d+/g) || [];
      if (groups.every(function (g) { return /^(19|20)\d\d$/.test(g); })) return m;
      return '[phone hidden]';
    });
  }
  /** Remove direct identifiers. `hidden` = exact lines to drop (name/contact header lines); `name` = candidate name. */
  function shield(text, opts) {
    opts = opts || {};
    var t = String(text || '');
    (opts.hiddenLines || []).forEach(function (l) {
      if (!l || !l.trim()) return;
      var placeholder = l === opts.name ? '[Candidate]' : '[contact line hidden]';
      t = t.split(l).join(placeholder);
    });
    if (opts.name && opts.name.trim().length > 2) t = t.split(opts.name.trim()).join('[Candidate]');
    t = t.replace(EMAIL_G, '[email hidden]').replace(URL_G, '[link hidden]');
    return maskPhones(t);
  }

  /* ---------- Weak-match-safe summary ---------- */
  /** Returns a summary line or null when the evidence doesn't support aligning to this role. */
  function alignedSummary(role, provenLabels, mustProven, mustTotal) {
    if (!provenLabels.length) return null;
    if (mustTotal && mustProven / mustTotal < 0.5) return null;
    return 'Verified experience in ' + provenLabels.join(', ') + ', relevant to the ' + role + ' role.';
  }

  var api = { isHeading: isHeading, parseRole: parseRole, DATE_RANGE: DATE_RANGE, factsOf: factsOf, lockViolations: lockViolations,
    unsupported: unsupported, shield: shield, maskPhones: maskPhones, alignedSummary: alignedSummary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
