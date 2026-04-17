import type { Globe, Pin } from "./types";
import { sanitizeExternalUrl } from "./url";

// Keep in sync with components/globe/globeCore.ts
const PIN_SIZE_MULTIPLIERS = { small: 0.7, medium: 1, large: 1.4 } as const;
const ROTATION_SPEEDS = { slow: 0.001, medium: 0.002, fast: 0.004 } as const;

// Escape for safe insertion inside an HTML text node (meta, title, etc.).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Validate hex/rgb color values before embedding in <style> blocks.
function safeCssColor(s: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(s.trim()) || /^rgba?\([\d\s,.%]+\)$/.test(s.trim())) {
    return s.trim();
  }
  return "#000000";
}

// Validate URLs to allow only http/https — blocks javascript: and other schemes.
function safeUrl(s: string): string {
  return sanitizeExternalUrl(s) ?? "";
}

// Safe JSON embed inside <script>: close-tag sequences must not appear raw.
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Builds a fully self-contained HTML document for a single globe. All user
 * strings are embedded via JSON and rendered via textContent at runtime (no
 * raw HTML injection). Theme colours, behaviour, and pin style are baked in.
 */
export function buildStandaloneHtml(globe: Globe, pins: Pin[]): string {
  const colors = {
    background: safeCssColor(globe.themeColors.background),
    land: safeCssColor(globe.themeColors.land),
    border: safeCssColor(globe.themeColors.border),
    pin: safeCssColor(globe.themeColors.pin),
  };
  const behaviour = globe.behaviour;
  const pinStyle = globe.pinStyle;

  const mult = PIN_SIZE_MULTIPLIERS[pinStyle.size];
  const rotSpeed = ROTATION_SPEEDS[behaviour.rotationSpeed];

  const pinData = pins.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    description: p.description ?? "",
    url: safeUrl(p.url ?? ""),
  }));

  const titleRaw = globe.metadata?.title || globe.name || "Globe";
  const descRaw = globe.metadata?.description || "";
  const title = escapeHtml(titleRaw);
  const metaDesc = escapeHtml(descRaw);

  // Light/dark aware text for the pin detail card.
  const isDark = isColorDark(colors.background);
  const cardText = isDark ? "#f4f4f4" : "#1a1a1a";
  const cardMuted = isDark ? "#8a8a8a" : "#5a5a5a";
  const tooltipBg = isDark
    ? "rgba(20,20,20,0.9)"
    : "rgba(255,255,255,0.92)";

  const cfg = {
    colors,
    behaviour,
    pinStyle,
    mult,
    rotSpeed,
    pins: pinData,
    cardText,
    cardMuted,
  };

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>${metaDesc ? `\n<meta name="description" content="${metaDesc}">` : ""}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:${colors.background};overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${cardText}}
canvas{display:block}
#tt{position:absolute;background:${tooltipBg};border:1px solid ${colors.border};border-radius:4px;padding:4px 9px;pointer-events:none;opacity:0;transition:opacity .15s;z-index:10;color:${cardMuted};font-size:12px;white-space:nowrap}
#tt.v{opacity:1}
#pd{position:absolute;left:20px;bottom:20px;background:${colors.land};border:1px solid ${colors.border};border-radius:10px;padding:16px 20px;z-index:80;min-width:200px;max-width:min(320px,calc(100vw - 40px));box-shadow:0 12px 40px rgba(0,0,0,.35);opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;pointer-events:none;color:${cardText}}
#pd.v{opacity:1;transform:translateY(0);pointer-events:auto}
#pd .n{font-size:15px;font-weight:500;color:${cardText};margin-bottom:4px;padding-right:20px}
#pd .co{font-size:11px;color:${cardMuted};margin-bottom:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#pd .d{font-size:13px;color:${cardMuted};line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
#pd .u{display:inline-block;margin-top:10px;font-size:12px;color:${cardText};text-decoration:none;border-bottom:1px solid ${colors.border};padding-bottom:1px}
#pd .u.hidden{display:none}
#pd .x{position:absolute;top:8px;right:10px;background:none;border:none;color:${cardMuted};cursor:pointer;font-size:16px;line-height:1;padding:4px}
#credit{position:absolute;right:12px;bottom:10px;font-size:10px;letter-spacing:.3px;color:${colors.pin};opacity:.4;text-decoration:none;padding:4px 8px}
.ld{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${colors.background};z-index:90;transition:opacity .6s}
.ld.h{opacity:0;pointer-events:none}
.sp{width:28px;height:28px;border:2px solid ${colors.border};border-top-color:${colors.pin};border-radius:50%;animation:s .9s linear infinite;margin-bottom:14px;opacity:.7}
@keyframes s{to{transform:rotate(360deg)}}
.lt{font-size:12px;color:${cardMuted}}
</style>
</head>
<body>
<div class="ld" id="ld"><div class="sp"></div><div class="lt">Loading…</div></div>
<div id="tt"></div>
<div id="pd"><button class="x" type="button" aria-label="Close">×</button><div class="n"></div><div class="co"></div><div class="d"></div><a class="u" target="_blank" rel="noopener noreferrer">Learn more →</a></div>
<a id="credit" href="https://globeify.web.app" target="_blank" rel="noopener noreferrer">Made with Globeify</a>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
(function(){
  var CFG = ${safeJson(cfg)};
  var PINS = CFG.pins;
  var R = 1, TW = 4096, TH = 2048;

  var scene = new THREE.Scene();
  var cam = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);
  cam.position.z = 3.2;
  var ren = new THREE.WebGLRenderer({antialias:true, alpha:true});
  ren.setSize(innerWidth, innerHeight);
  ren.setPixelRatio(Math.min(devicePixelRatio, 2));
  ren.setClearColor(0x000000, 0);
  document.body.prepend(ren.domElement);

  var gm = new THREE.MeshPhongMaterial({color:0xffffff, specular:0x111111, shininess:12});
  var globe = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), gm);
  scene.add(globe);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  var dl1 = new THREE.DirectionalLight(0xffffff, 0.5); dl1.position.set(5,3,5); scene.add(dl1);
  var dl2 = new THREE.DirectionalLight(0x888888, 0.2); dl2.position.set(-4,-2,-4); scene.add(dl2);

  function hexInt(h, fb){ var m=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h||'').trim()); if(!m) return fb; var s=m[1]; if(s.length===3){ s=s.split('').map(function(c){return c+c;}).join(''); } return parseInt(s,16); }
  var PIN_HEX = hexInt(CFG.colors.pin, 0xffffff);

  function ll(lat, lng, r){ var p=(90-lat)*Math.PI/180, t=(lng+180)*Math.PI/180; return new THREE.Vector3(-r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t)); }
  function lp(lng, lat){ return [((lng+180)/360)*TW, ((90-lat)/180)*TH]; }
  function splitAntimeridian(ring){ var segs=[], cur=[ring[0]]; for(var i=1;i<ring.length;i++){ if(Math.abs(ring[i][0]-ring[i-1][0])>180){ segs.push(cur); cur=[ring[i]]; } else cur.push(ring[i]); } segs.push(cur); return segs; }
  function decodeTopo(t){
    var o=t.objects[Object.keys(t.objects)[0]], arcs=t.arcs, tr=t.transform, fs=[];
    function da(i){ var rv=i<0, ix=rv?~i:i, ar=arcs[ix], c=[], x=0, y=0; for(var j=0;j<ar.length;j++){ x+=ar[j][0]; y+=ar[j][1]; c.push(tr?[x*tr.scale[0]+tr.translate[0], y*tr.scale[1]+tr.translate[1]]:[x,y]); } if(rv) c.reverse(); return c; }
    function dr(r){ var c=[]; for(var i=0;i<r.length;i++){ var d=da(r[i]); if(i>0) d.shift(); c=c.concat(d); } return c; }
    (o.geometries||[o]).forEach(function(gm2){ var ps=[]; if(gm2.type==='Polygon') ps.push(gm2.arcs.map(dr)); else if(gm2.type==='MultiPolygon') gm2.arcs.forEach(function(p){ ps.push(p.map(dr)); }); fs.push({polygons:ps}); });
    return fs;
  }

  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(function(r){ return r.json(); })
    .then(function(d){
      var fs = decodeTopo(d);
      var cv = document.createElement('canvas'); cv.width=TW; cv.height=TH;
      var cx = cv.getContext('2d');
      cx.fillStyle = CFG.colors.background; cx.fillRect(0,0,TW,TH);
      if (CFG.behaviour.showGraticule) {
        cx.strokeStyle = 'rgba(127,127,127,0.08)'; cx.lineWidth = 1;
        for (var lat=-80; lat<=80; lat+=20){ var y=lp(0,lat)[1]; cx.beginPath(); cx.moveTo(0,y); cx.lineTo(TW,y); cx.stroke(); }
        for (var lng=-180; lng<180; lng+=20){ var x=lp(lng,0)[0]; cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,TH); cx.stroke(); }
      }
      cx.fillStyle = CFG.colors.land;
      fs.forEach(function(f){ f.polygons.forEach(function(p){ cx.beginPath(); for(var r2=0;r2<p.length;r2++){ var ring=p[r2]; if(ring.length<3) continue; var segs=splitAntimeridian(ring); for(var s=0;s<segs.length;s++){ var seg=segs[s], pt=lp(seg[0][0],seg[0][1]); cx.moveTo(pt[0],pt[1]); for(var i=1;i<seg.length;i++){ pt=lp(seg[i][0],seg[i][1]); cx.lineTo(pt[0],pt[1]); } cx.closePath(); } } cx.fill('evenodd'); }); });
      if (CFG.behaviour.showBorders) {
        cx.strokeStyle = CFG.colors.border; cx.lineWidth = 1.2;
        fs.forEach(function(f){ f.polygons.forEach(function(p){ var ring=p[0]; if(!ring||ring.length<3) return; var segs=splitAntimeridian(ring); for(var s=0;s<segs.length;s++){ cx.beginPath(); var seg=segs[s], pt=lp(seg[0][0],seg[0][1]); cx.moveTo(pt[0],pt[1]); for(var i=1;i<seg.length;i++){ pt=lp(seg[i][0],seg[i][1]); cx.lineTo(pt[0],pt[1]); } cx.stroke(); } }); });
      }
      var tx = new THREE.CanvasTexture(cv);
      tx.wrapS = THREE.RepeatWrapping;
      tx.anisotropy = ren.capabilities.getMaxAnisotropy();
      gm.map = tx; gm.needsUpdate = true;
      document.getElementById('ld').className = 'ld h';
    })
    .catch(function(){ document.getElementById('ld').className = 'ld h'; });

  // Pins
  var pg = new THREE.Group(); globe.add(pg);
  var mult = CFG.mult;
  var headR = 0.008 * mult, stalkH = 0.04 * mult, stalkR = 0.0018 * mult, hitR = 0.028 * mult, ringR = 0.004 * mult;
  var pinHeads = [];

  PINS.forEach(function(pin, i){
    var gr = new THREE.Group();
    gr.userData = { pin: pin, index: i };
    var s = new THREE.Mesh(new THREE.CylinderGeometry(stalkR, stalkR, stalkH, 6), new THREE.MeshBasicMaterial({color:0xbbbbbb}));
    s.position.y = stalkH/2; gr.add(s);
    var h = new THREE.Mesh(new THREE.SphereGeometry(headR, 10, 10), new THREE.MeshPhongMaterial({color:PIN_HEX, emissive:0x555555, specular:0xaaaaaa, shininess:40}));
    h.position.y = stalkH + headR; gr.add(h); pinHeads.push(h);
    if (CFG.pinStyle.showRing) {
      var rg = new THREE.Mesh(new THREE.CircleGeometry(ringR, 16), new THREE.MeshBasicMaterial({color:PIN_HEX, side:THREE.DoubleSide, transparent:true, opacity:0.4}));
      rg.rotation.x = -Math.PI/2; rg.position.y = 0.0005; gr.add(rg);
    }
    var ha = new THREE.Mesh(new THREE.SphereGeometry(hitR, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
    ha.position.y = stalkH/2; gr.add(ha);
    var p = ll(pin.lat, pin.lng, R);
    gr.position.copy(p);
    gr.lookAt(p.clone().multiplyScalar(2));
    pg.add(gr);
  });

  // Interaction
  var rc = new THREE.Raycaster(), ms = new THREE.Vector2();
  var dragging=false, dragMoved=false, prev={x:0,y:0};
  var autoRotate = !!CFG.behaviour.autoRotate, arActive = autoRotate, targetRot=null, resumeT=null;
  var tt = document.getElementById('tt'), pd = document.getElementById('pd');
  var pdN = pd.querySelector('.n'), pdCo = pd.querySelector('.co'), pdD = pd.querySelector('.d'), pdU = pd.querySelector('.u');

  function scheduleResume(){
    if (!autoRotate) return;
    if (CFG.behaviour.idleBehaviour === 'stay') return;
    if (resumeT) clearTimeout(resumeT);
    resumeT = setTimeout(function(){ resumeT=null; arActive=true; }, 3000);
  }

  function selectPin(pin){
    pdN.textContent = pin.name;
    pdCo.textContent = pin.lat.toFixed(4) + '\\u00b0, ' + pin.lng.toFixed(4) + '\\u00b0';
    pdD.textContent = pin.description || '';
    pdD.style.display = pin.description ? '' : 'none';
    if (pin.url) { pdU.href = pin.url; pdU.classList.remove('hidden'); }
    else { pdU.removeAttribute('href'); pdU.classList.add('hidden'); }
    pd.className = 'v';
    arActive = false;
    var p = ll(pin.lat, pin.lng, R);
    targetRot = { x: -Math.asin(p.y/R), y: Math.atan2(p.x, p.z) };
    if (resumeT) clearTimeout(resumeT);
    resumeT = setTimeout(function(){ resumeT=null; if (autoRotate && CFG.behaviour.idleBehaviour==='resume') arActive=true; }, 5000);
  }
  function deselectPin(){ pd.className = ''; }
  pd.querySelector('.x').addEventListener('click', deselectPin);

  var canvas = ren.domElement;
  canvas.addEventListener('pointerdown', function(e){ if(e.button!==undefined && e.button!==0) return; dragging=true; dragMoved=false; prev={x:e.clientX, y:e.clientY}; arActive=false; if(resumeT){ clearTimeout(resumeT); resumeT=null; } });
  window.addEventListener('pointerup', function(){ if(!dragging) return; dragging=false; scheduleResume(); });
  canvas.addEventListener('pointermove', function(e){
    var r = canvas.getBoundingClientRect();
    ms.x = ((e.clientX - r.left)/r.width)*2 - 1;
    ms.y = -((e.clientY - r.top)/r.height)*2 + 1;
    if (dragging) {
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx)>2 || Math.abs(dy)>2) dragMoved = true;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, globe.rotation.x + dy*0.005));
      prev = {x:e.clientX, y:e.clientY};
      targetRot = null;
      tt.className = '';
      return;
    }
    rc.setFromCamera(ms, cam);
    var meshes = [];
    pg.children.forEach(function(gr){ gr.traverse(function(c){ if(c.isMesh){ c.userData._pg = gr; meshes.push(c); } }); });
    var hits = rc.intersectObjects(meshes, false);
    if (hits.length) {
      var data = hits[0].object.userData._pg.userData;
      tt.textContent = data.pin.name;
      tt.className = 'v';
      tt.style.left = (e.clientX + 14) + 'px';
      tt.style.top = (e.clientY - 28) + 'px';
      canvas.style.cursor = 'pointer';
    } else {
      tt.className = '';
      canvas.style.cursor = dragging ? 'grabbing' : 'grab';
    }
  });
  canvas.addEventListener('click', function(e){
    if (dragMoved) return;
    var r = canvas.getBoundingClientRect();
    var ndc = new THREE.Vector2(((e.clientX - r.left)/r.width)*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
    rc.setFromCamera(ndc, cam);
    var meshes = [];
    pg.children.forEach(function(gr){ gr.traverse(function(c){ if(c.isMesh){ c.userData._pg = gr; meshes.push(c); } }); });
    var hits = rc.intersectObjects(meshes, false);
    if (hits.length) selectPin(hits[0].object.userData._pg.userData.pin);
    else deselectPin();
  });

  addEventListener('resize', function(){
    cam.aspect = innerWidth/innerHeight;
    cam.updateProjectionMatrix();
    ren.setSize(innerWidth, innerHeight);
  });

  canvas.style.cursor = 'grab';
  var t0 = performance.now();

  (function tick(){
    requestAnimationFrame(tick);
    if (targetRot) {
      globe.rotation.x += (targetRot.x - globe.rotation.x) * 0.04;
      globe.rotation.y += (targetRot.y - globe.rotation.y) * 0.04;
      if (Math.abs(globe.rotation.x - targetRot.x) < 0.001 && Math.abs(globe.rotation.y - targetRot.y) < 0.001) targetRot = null;
    } else if (autoRotate && arActive && !dragging) {
      globe.rotation.y += CFG.rotSpeed;
    }
    if (CFG.pinStyle.pulse) {
      var t = (performance.now() - t0) / 1000;
      var sc = 1 + 0.15 * (Math.sin(t * 2 * Math.PI * 0.8) + 1);
      pinHeads.forEach(function(h){ h.scale.setScalar(sc); });
    }
    ren.render(scene, cam);
  })();
})();
<\/script>
</body></html>`;
}

function isColorDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128;
}
