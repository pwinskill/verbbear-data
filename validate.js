#!/usr/bin/env node
// Schema validator for verbs.json and sentences.json.
// Run by CI (.github/workflows/validate.yml) on every push and PR.
// Pure Node, zero dependencies.
//
// Exits 0 on success, 1 on any failure with a human-readable error message
// naming the offending entry. Branch protection on main requires this to pass.

const fs = require("node:fs");
const path = require("node:path");

const ALLOWED_GROUPS = new Set(["regular_er", "regular_ir", "regular_re", "irregular"]);
const ALLOWED_PATTERNS = ALLOWED_GROUPS;
const ALLOWED_TENSES = new Set(["present", "passe_compose", "imparfait", "futur", "futur_proche", "conditionnel"]);
const REQUIRED_BASE_TENSES = ["present", "passe_compose", "imparfait", "futur"];
const ALLOWED_PERSONS = new Set(["je", "tu", "il", "elle", "nous", "vous", "ils", "elles"]);
const ALLOWED_AUX = new Set(["avoir", "être"]);

const errors = [];
function err(msg) { errors.push(msg); }

function loadJson(filename) {
  const file = path.join(__dirname, filename);
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    err(`${filename}: cannot read file (${e.message})`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    err(`${filename}: malformed JSON — ${e.message}`);
    return null;
  }
}

function validateVerbs(verbs) {
  if (!Array.isArray(verbs)) {
    err("verbs.json: top-level must be an array");
    return null;
  }
  if (verbs.length === 0) {
    err("verbs.json: array is empty");
    return null;
  }
  const infs = new Set();
  const ranks = new Set();
  for (const [i, v] of verbs.entries()) {
    const tag = `verbs.json[${i}] (${v && v.inf ? v.inf : "<no inf>"})`;
    if (!v || typeof v !== "object") { err(`${tag}: not an object`); continue; }
    if (typeof v.inf !== "string" || !v.inf) err(`${tag}: missing/empty "inf"`);
    if (typeof v.en !== "string" || !v.en) err(`${tag}: missing/empty "en"`);
    if (typeof v.aux !== "string" || !ALLOWED_AUX.has(v.aux)) err(`${tag}: "aux" must be one of ${[...ALLOWED_AUX].join(", ")}`);
    if (typeof v.rank !== "number" || !Number.isInteger(v.rank) || v.rank < 1) err(`${tag}: "rank" must be a positive integer`);
    if (typeof v.pattern !== "string" || !ALLOWED_PATTERNS.has(v.pattern)) {
      err(`${tag}: "pattern" must be one of ${[...ALLOWED_PATTERNS].join(", ")}`);
    }
    if (v.pattern === "irregular") {
      if (!v.tenses || typeof v.tenses !== "object") {
        err(`${tag}: irregular verbs require "tenses"`);
      } else {
        for (const t of REQUIRED_BASE_TENSES) {
          if (!Array.isArray(v.tenses[t]) || v.tenses[t].length !== 6 || !v.tenses[t].every(s => typeof s === "string" && s.length)) {
            err(`${tag}: "tenses.${t}" must be a 6-element non-empty string array`);
          }
        }
      }
    }
    if (typeof v.inf === "string" && v.inf) {
      if (infs.has(v.inf)) err(`${tag}: duplicate "inf" — ${v.inf}`);
      infs.add(v.inf);
    }
    if (Number.isInteger(v.rank)) {
      if (ranks.has(v.rank)) err(`${tag}: duplicate "rank" — ${v.rank}`);
      ranks.add(v.rank);
    }
  }
  return infs;
}

function validateSentences(sentences, verbInfs) {
  if (!Array.isArray(sentences)) {
    err("sentences.json: top-level must be an array");
    return;
  }
  if (sentences.length === 0) {
    err("sentences.json: array is empty");
    return;
  }
  const ids = new Set();
  for (const [i, s] of sentences.entries()) {
    const tag = `sentences.json[${i}] (id=${s && s.id !== undefined ? s.id : "<no id>"})`;
    if (!s || typeof s !== "object") { err(`${tag}: not an object`); continue; }
    if (s.id === undefined || s.id === null) err(`${tag}: missing "id"`);
    if (typeof s.verb !== "string" || !s.verb) err(`${tag}: missing/empty "verb"`);
    if (typeof s.tense !== "string" || !ALLOWED_TENSES.has(s.tense)) err(`${tag}: "tense" must be one of ${[...ALLOWED_TENSES].join(", ")}`);
    if (typeof s.person !== "string" || !ALLOWED_PERSONS.has(s.person)) err(`${tag}: "person" must be one of ${[...ALLOWED_PERSONS].join(", ")}`);
    if (typeof s.fr !== "string" || !s.fr) err(`${tag}: missing/empty "fr"`);
    if (typeof s.en !== "string" || !s.en) err(`${tag}: missing/empty "en"`);
    if (typeof s.answer !== "string" || !s.answer) err(`${tag}: missing/empty "answer"`);
    if (verbInfs && typeof s.verb === "string" && !verbInfs.has(s.verb)) {
      err(`${tag}: "verb"=${s.verb} not found in verbs.json`);
    }
    if (s.id !== undefined && s.id !== null) {
      if (ids.has(s.id)) err(`${tag}: duplicate "id" — ${s.id}`);
      ids.add(s.id);
    }
  }
}

const verbs = loadJson("verbs.json");
const sentences = loadJson("sentences.json");
const verbInfs = verbs ? validateVerbs(verbs) : null;
if (sentences) validateSentences(sentences, verbInfs);

if (errors.length) {
  console.error(`✗ Validation failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`✓ verbs.json: ${verbs.length} entries`);
console.log(`✓ sentences.json: ${sentences.length} entries`);
console.log("All schema checks passed.");
