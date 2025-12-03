/* Kana-Drill-Master – komplette Logik (minimal, strukturiert) */
const $ = sel => document.querySelector(sel);

// UI
const glyph = $("#glyph");
const ans   = $("#answer");
const fb    = $("#feedback");
const modeSel   = $("#mode");
const overlay   = $("#overlay");
const grid      = $("#grid");
const btnCustom = $("#btnCustom");
const btnReset  = $("#btnReset");
const sortSel   = $("#sortMode");
const ovlCancel = $("#ovlCancel");
const ovlSave   = $("#ovlSave");

/* ---------- Daten ---------- */
function pair(h, k, rom, group) {
  return [
    {kana:h, rom, group: group || "hira"},
    {kana:k, rom, group: (group || "kata").replace("hira","kata")}
  ];
}
// Grundreihen
const BASE = [
  pair("あ","ア","a"), pair("い","イ","i"), pair("う","ウ","u"),
  pair("え","エ","e"), pair("お","オ","o"),
  pair("か","カ","ka"), pair("き","キ","ki"), pair("く","ク","ku"), pair("け","ケ","ke"), pair("こ","コ","ko"),
  pair("さ","サ","sa"), pair("し","シ","shi"), pair("す","ス","su"), pair("せ","セ","se"), pair("そ","ソ","so"),
  pair("た","タ","ta"), pair("ち","チ","chi"), pair("つ","ツ","tsu"), pair("て","テ","te"), pair("と","ト","to"),
  pair("な","ナ","na"), pair("に","ニ","ni"), pair("ぬ","ヌ","nu"), pair("ね","ネ","ne"), pair("の","ノ","no"),
  pair("は","ハ","ha"), pair("ひ","ヒ","hi"), pair("ふ","フ","fu"), pair("へ","ヘ","he"), pair("ほ","ホ","ho"),
  pair("ま","マ","ma"), pair("み","ミ","mi"), pair("む","ム","mu"), pair("め","メ","me"), pair("も","モ","mo"),
  pair("や","ヤ","ya"), pair("ゆ","ユ","yu"), pair("よ","ヨ","yo"),
  pair("ら","ラ","ra"), pair("り","リ","ri"), pair("る","ル","ru"), pair("れ","レ","re"), pair("ろ","ロ","ro"),
  pair("わ","ワ","wa"), pair("を","ヲ","wo"),
  [{kana:"ん",rom:"n",group:"hira"}, {kana:"ン",rom:"n",group:"kata"}]
].flat();

// Dakuten / Handakuten
const DAK = [
  pair("が","ガ","ga","hira_dak"), pair("ぎ","ギ","gi","hira_dak"), pair("ぐ","グ","gu","hira_dak"),
  pair("げ","ゲ","ge","hira_dak"), pair("ご","ゴ","go","hira_dak"),
  pair("ざ","ザ","za","hira_dak"), pair("じ","ジ","ji","hira_dak"), pair("ず","ズ","zu","hira_dak"),
  pair("ぜ","ゼ","ze","hira_dak"), pair("ぞ","ゾ","zo","hira_dak"),
  pair("だ","ダ","da","hira_dak"), pair("ぢ","ヂ","ji","hira_dak"), pair("づ","ヅ","zu","hira_dak"),
  pair("で","デ","de","hira_dak"), pair("ど","ド","do","hira_dak"),
  pair("ば","バ","ba","hira_dak"), pair("び","ビ","bi","hira_dak"), pair("ぶ","ブ","bu","hira_dak"),
  pair("べ","ベ","be","hira_dak"), pair("ぼ","ボ","bo","hira_dak")
].flat();

const HANDAK = [
  pair("ぱ","パ","pa","hira_handak"), pair("ぴ","ピ","pi","hira_handak"),
  pair("ぷ","プ","pu","hira_handak"), pair("ぺ","ペ","pe","hira_handak"),
  pair("ぽ","ポ","po","hira_handak")
].flat();

const ALL = [...BASE, ...DAK, ...HANDAK];

const GROUP_ORDER = {
  hira:1, kata:2, hira_dak:3, kata_dak:4, hira_handak:5, kata_handak:6
};
const LS = (k,v)=>v===undefined?JSON.parse(localStorage.getItem(k)||"null")
                              :localStorage.setItem(k,JSON.stringify(v));
const KEY_STATS  = "kdm_stats_v1";
const KEY_CUSTOM = "kdm_custom_v1";

let STATS  = LS(KEY_STATS)  || {};         // id -> {streak,right,wrong}
let CUSTOM = new Set(LS(KEY_CUSTOM) || []); // Set<number>

const idOf = o => ALL.indexOf(o);
const S = id => (STATS[id] ||= {streak:0,right:0,wrong:0});

/* ---------- Drill-Queue ---------- */
let pool = [];   // IDs nach Modus/Custom
let queue = [];  // anstehende IDs
let cur   = null;

function buildPool(){
  const m = modeSel.value;
  const filt = {
    hira:       o=>o.group==="hira",
    kata:       o=>o.group==="kata",
    hira_dak:   o=>o.group==="hira_dak",
    kata_dak:   o=>o.group==="kata_dak",
    hira_handak:o=>o.group==="hira_handak",
    kata_handak:o=>o.group==="kata_handak",
    custom:     o=>CUSTOM.size ? CUSTOM.has(idOf(o)) : true
  }[m];

  pool = ALL.map((o,i)=>i).filter(i=>filt(ALL[i]));
  if(pool.length===0) pool = ALL.map((_,i)=>i);
}

function refillQueue(){
  queue = shuffle(pool.slice());
  // klein halten
  if(queue.length>12) queue = queue.slice(0,12);
}

function nextCard(){
  if(queue.length===0) refillQueue();
  cur = queue.shift();
  glyph.textContent = ALL[cur].kana;
}

/* ---------- Auswertung ---------- */
function check(inputRaw){
  const expect = ALL[cur].rom;
  const input  = norm(inputRaw);
  const ok     = input === expect;

  if(ok){
    const s=S(cur); s.streak++; s.right++; LS(KEY_STATS,STATS);
    fb.className = "feedback goodbox";
    fb.innerHTML = `✔ ${ALL[cur].kana} = <b>${expect}</b>`;
    // normal weiter
  }else{
    const s=S(cur); s.streak=0; s.wrong++; LS(KEY_STATS,STATS);
    fb.className = "feedback badbox";
    fb.innerHTML = `✖ ${ALL[cur].kana} = <b>${expect}</b><br/>${inputRaw||"∅"} = <b>${meaningOf(input)}</b>`;
    // erneut in 2 Schritten
    queue.splice(Math.min(2,queue.length),0,cur);
  }
  nextCard();
}

/* ---------- Helpers ---------- */
function norm(x){ return String(x||"").trim().toLowerCase(); }
function meaningOf(r){
  const hit = ALL.find(o=>o.rom===r);
  return hit ? hit.kana : "–";
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

/* ---------- Custom-Overlay ---------- */
const GOJUON = [
  "a","i","u","e","o",
  "ka","ki","ku","ke","ko",
  "sa","shi","su","se","so",
  "ta","chi","tsu","te","to",
  "na","ni","nu","ne","no",
  "ha","hi","fu","he","ho",
  "ma","mi","mu","me","mo",
  "ya","yu","yo",
  "ra","ri","ru","re","ro",
  "wa","wo","n",
  "ga","gi","gu","ge","go",
  "za","ji","zu","ze","zo",
  "da","ji","zu","de","do",
  "ba","bi","bu","be","bo",
  "pa","pi","pu","pe","po"
];
const GOJUON_RANK = GOJUON.reduce((m,rom,i)=>{ if(!(rom in m)) m[rom]=i; return m; },{});

function colorClass(stat){
  if(!stat) return "bad";
  if(stat.streak>=3) return "good";
  if(stat.right >= stat.wrong) return "mid";
  return "bad";
}

function sortForOverlay(items, mode){
  if(mode==="gojuon"){
    return items.slice().sort((a,b)=>{
      const ra = GOJUON_RANK[a.rom] ?? 1e9;
      const rb = GOJUON_RANK[b.rom] ?? 1e9;
      if(ra!==rb) return ra-rb;
      return GROUP_ORDER[a.group]-GROUP_ORDER[b.group];
    });
  }
  // Alphabetisch nach Romaji
  return items.slice().sort((a,b)=>{
    const p = a.rom.localeCompare(b.rom);
    if(p!==0) return p;
    return GROUP_ORDER[a.group]-GROUP_ORDER[b.group];
  });
}

function buildGrid(){
  const mode = (sortSel && sortSel.value) || "alpha";
  const arr = sortForOverlay(ALL.map((o,i)=>({i,...o})), mode);

  grid.innerHTML = "";
  arr.forEach(o=>{
    const tile = document.createElement("div");
    tile.className = "tile " + colorClass(STATS[o.i]);
    if(CUSTOM.has(o.i)) tile.classList.add("sel");
    tile.dataset.i = String(o.i);

    const k = document.createElement("div"); k.className="k"; k.textContent=o.kana;
    const r = document.createElement("div"); r.className="r"; r.textContent=o.rom;
    tile.appendChild(k); tile.appendChild(r);

    tile.addEventListener("click", ()=>{
      if(CUSTOM.has(o.i)){ CUSTOM.delete(o.i); tile.classList.remove("sel"); }
      else { CUSTOM.add(o.i); tile.classList.add("sel"); }
    });

    grid.appendChild(tile);
  });
}

function openOverlay(){ buildGrid(); overlay.style.display="flex"; }
function closeOverlay(){ overlay.style.display="none"; }

/* ---------- Events ---------- */
modeSel.addEventListener("change", ()=>{
  buildPool(); refillQueue(); nextCard(); ans.focus();
});

ans.addEventListener("keydown",(e)=>{
  if(e.key==="Enter"){
    const v = ans.value;
    ans.value = "";
    check(v);
  }
});

btnCustom.addEventListener("click", openOverlay);
ovlCancel.addEventListener("click", closeOverlay);
ovlSave.addEventListener("click", ()=>{
  LS(KEY_CUSTOM, Array.from(CUSTOM));
  closeOverlay();
  if(modeSel.value==="custom"){ buildPool(); refillQueue(); nextCard(); }
});
if(sortSel) sortSel.addEventListener("change", buildGrid);

btnReset.addEventListener("click", ()=>{
  if(confirm("Alle Lernstatistiken löschen?")){
    STATS = {}; LS(KEY_STATS,STATS);
    if(overlay.style.display!=="none") buildGrid();
  }
});

/* ---------- Init ---------- */
buildPool();
refillQueue();
nextCard();
ans.focus();