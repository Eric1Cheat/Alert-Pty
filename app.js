const $ = id => document.getElementById(id);
const fit = c => { const r = c.getBoundingClientRect(), d = devicePixelRatio || 1; c.width = r.width * d; c.height = r.height * d; return d; };

/* Fondo: red de nodos sísmicos en movimiento */
const nc = $('net'), nx = nc.getContext('2d'); let nodes = [];
function initNet() { fit(nc); nodes = Array.from({ length: Math.min(70, Math.round(nc.width / 28)) }, () => ({ x: Math.random() * nc.width, y: Math.random() * nc.height, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5 })); }
function netLoop() {
  nx.clearRect(0, 0, nc.width, nc.height); const L = 150 * (devicePixelRatio || 1);
  nodes.forEach((a, i) => {
    a.x = (a.x + a.vx + nc.width) % nc.width; a.y = (a.y + a.vy + nc.height) % nc.height;
    nx.fillStyle = '#7fd8ff55'; nx.beginPath(); nx.arc(a.x, a.y, 1.8, 0, 7); nx.fill();
    for (let j = i + 1; j < nodes.length; j++) { const b = nodes[j], k = Math.hypot(a.x - b.x, a.y - b.y); if (k < L) { nx.strokeStyle = `rgba(127,216,255,${.16 * (1 - k / L)})`; nx.beginPath(); nx.moveTo(a.x, a.y); nx.lineTo(b.x, b.y); nx.stroke(); } }
  });
  requestAnimationFrame(netLoop);
}
initNet(); netLoop(); addEventListener('resize', initNet);

/* Simulador de detección STA/LTA (más lento y legible) */
const sc = $('seismo'), sx = sc.getContext('2d'), N = 300; let buf = Array(N).fill(0), amp = 0, trig = false, audio;
let frame = 0, sr = 1, sp = .02, peakR = 1, peakP = 0, lastUI = 0;
$('mag').oninput = e => $('mv').textContent = e.target.value;
$('dist').oninput = e => $('dv').textContent = e.target.value + ' km';
function beep() {
  if (!$('sound').checked) return;
  try { audio = audio || new AudioContext(); [0, .25, .5].forEach(s => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 880; g.gain.value = .08; o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + s); o.stop(audio.currentTime + s + .15); }); } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
$('go').onclick = () => { amp = Math.pow(2, +$('mag').value - 3) * 3; trig = false; peakR = 1; peakP = 0; };
$('reset').onclick = () => { amp = 0; trig = false; buf.fill(0); sr = 1; sp = .02; peakR = 1; peakP = 0; $('status').className = 'status'; $('status').textContent = 'Sin actividad sísmica relevante.'; $('eta').textContent = '—'; };
function simLoop() {
  const d = fit(sc); frame++; amp *= .992;
  if (frame % 4 === 0) {                      /* ~15 muestras por segundo */
    buf.push((Math.random() - .5) * 2 + (Math.random() - .5) * amp * 2); buf.shift();
    const a = buf.map(Math.abs), sta = a.slice(-10).reduce((x, y) => x + y) / 10, lta = a.slice(-150).reduce((x, y) => x + y) / 150;
    const r = sta / Math.max(lta, .3), p = 1 / (1 + Math.exp(-(r - 3) * 1.6));
    sr += (r - sr) * .2; sp += (p - sp) * .2; peakR = Math.max(peakR, sr); peakP = Math.max(peakP, sp);
    if (sp > .75 && !trig) {
      trig = true; const s = Math.max(0, +$('dist').value / 3.5 - 5);
      $('eta').textContent = Math.round(s) + ' s'; $('status').className = 'status alarm';
      $('status').textContent = 'Alerta: sismo M' + $('mag').value + ' detectado. Agáchate, cúbrete y sujétate.'; beep();
    }
  }
  if (performance.now() - lastUI > 250) {     /* los números se actualizan 4 veces por segundo */
    lastUI = performance.now();
    $('ratio').textContent = sr.toFixed(1); $('prob').textContent = Math.round(sp * 100) + '%';
    $('ratioBar').style.width = Math.min(100, sr / 8 * 100) + '%'; $('probBar').style.width = sp * 100 + '%';
    $('ratioPk').textContent = 'Pico: ' + peakR.toFixed(1); $('probPk').textContent = 'Pico: ' + Math.round(peakP * 100) + '%';
  }
  sx.clearRect(0, 0, sc.width, sc.height); sx.shadowBlur = 12 * d; sx.shadowColor = trig ? '#ff5a5f' : '#2EC4B6';
  sx.strokeStyle = trig ? '#ff7b80' : '#2EC4B6'; sx.lineWidth = 2 * d; sx.beginPath();
  buf.forEach((y, i) => { const X = i * sc.width / N, Y = sc.height / 2 + Math.max(-1, Math.min(1, y * .06)) * sc.height * .45; i ? sx.lineTo(X, Y) : sx.moveTo(X, Y); });
  sx.stroke(); requestAnimationFrame(simLoop);
}
simLoop();

/* Mapa real con Leaflet + sismos del USGS */
const B = { lat0: 6.5, lat1: 10, lon0: -84, lon1: -76.5 };
let map, layer;
try {
  map = L.map('map', { scrollWheelZoom: false, preferCanvas: true }).fitBounds([[B.lat0, B.lon0], [B.lat1, B.lon1]]);
  const esri = s => L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${s}/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 16, attribution: 'Tiles &copy; Esri' });
  const bases = { 'Oscuro': esri('Canvas/World_Dark_Gray_Base'), 'Calles': esri('World_Street_Map'), 'Satélite': esri('World_Imagery'), 'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }) };
  let failed = 0; bases['Oscuro'].addTo(map);
  bases['Oscuro'].on('tileerror', () => { if (++failed === 3) { map.removeLayer(bases['Oscuro']); bases['Calles'].addTo(map); } });
  L.control.layers(bases, null, { position: 'topright' }).addTo(map);
  L.rectangle([[B.lat0, B.lon0], [B.lat1, B.lon1]], { color: '#2EC4B6', weight: 1, fill: false, dashArray: '4 6' }).addTo(map);
  [['Ciudad de Panamá', 8.98, -79.52], ['Colón', 9.36, -79.9], ['David', 8.43, -82.43], ['Penonomé', 8.52, -80.36], ['Chitré', 7.96, -80.43], ['Santiago', 8.1, -80.98]]
    .forEach(([n, la, lo]) => L.circleMarker([la, lo], { radius: 4, color: '#fff', weight: 1, fillColor: '#0A2540', fillOpacity: 1 }).addTo(map).bindTooltip(n, { permanent: true, direction: 'right', className: 'city', offset: [6, 0] }));
  layer = L.layerGroup().addTo(map);
  addEventListener('load', () => map.invalidateSize()); setTimeout(() => map.invalidateSize(), 600);
} catch (e) { $('map').innerHTML = '<p style="padding:24px;color:#fff">No se pudo cargar el mapa. Revisa tu conexión a internet y abre index.html desde un navegador (Chrome, Safari o Firefox).</p>'; }
const sample = [{ place: 'Cerca de Puerto Armuelles (ejemplo)', mag: 4.6, depth: 18, lat: 8.1, lon: -82.9 }, { place: 'Golfo de Panamá (ejemplo)', mag: 3.8, depth: 10, lat: 8.0, lon: -79.2 }, { place: 'Darién (ejemplo)', mag: 4.1, depth: 25, lat: 7.7, lon: -77.9 }, { place: 'Sur de Coiba (ejemplo)', mag: 5.2, depth: 12, lat: 6.9, lon: -81.6 }];
let quakes = sample, known = null;
const col = q => q.depth < 30 ? '#ff5a5f' : q.depth < 70 ? '#ffb020' : '#2ec4b6';
const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'ahora' : m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d'; };
const detail = q => `<b>Magnitud ${(+q.mag).toFixed(1)}</b> · ${q.place} · profundidad ${Math.round(q.depth)} km${q.time ? ' · ' + ago(q.time) : ''}`;
function drawMap() {
  if (!layer) return;
  layer.clearLayers();
  quakes.slice().reverse().forEach(q => {
    const m = L.circleMarker([q.lat, q.lon], { radius: 3 + (q.mag || 0) * 2.6, color: col(q), weight: 2, fillColor: col(q), fillOpacity: .45 }).addTo(layer);
    m.bindPopup(detail(q)); m.on('click', () => $('info').innerHTML = detail(q));
    if (q.mag >= 3.5 && q.time && Date.now() - q.time < 864e5) L.marker([q.lat, q.lon], { interactive: false, icon: L.divIcon({ className: 'pk', html: '', iconSize: [26, 26] }) }).addTo(layer).getElement().style.setProperty('--c', col(q));
  });
}
function renderFeed() {
  $('feed').innerHTML = quakes.slice(0, 8).map(q => `<div class="ev"><b class="m ${q.mag >= 4.5 ? 'hi' : ''}">M${(+q.mag).toFixed(1)}</b><span>${q.place}</span><small>${q.time ? ago(q.time) : ''}</small></div>`).join('');
}
function stats() {
  if (!quakes[0] || !quakes[0].time) return;
  const top = quakes.reduce((a, b) => b.mag > a.mag ? b : a);
  $('s1').textContent = quakes.length; $('s2').textContent = 'M' + (+top.mag).toFixed(1); $('s3').textContent = ago(quakes[0].time);
}
function load() {
  const from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${B.lat0}&maxlatitude=${B.lat1}&minlongitude=${B.lon0}&maxlongitude=${B.lon1}&starttime=${from}&limit=20000&orderby=time`)
    .then(r => r.json()).then(j => {
      quakes = j.features.map(f => ({ id: f.id, place: f.properties.place || 'Región de Panamá', mag: f.properties.mag, time: f.properties.time, depth: f.geometry.coordinates[2], lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }));
      if (known) { const n = quakes.find(q => !known.has(q.id) && q.mag >= 4.5); if (n) { $('status').className = 'status alarm'; $('status').textContent = 'Nuevo sismo M' + n.mag.toFixed(1) + ' en ' + n.place; beep(); } }
      known = new Set(quakes.map(q => q.id));
      const n24 = quakes.filter(q => Date.now() - q.time < 864e5).length; $('upd').textContent = quakes.length + ' sismos (30 días) · ' + n24 + ' en 24 h · actualizado ' + new Date().toLocaleTimeString('es-PA'); $('upd').parentNode.classList.remove('off');
      $('info').textContent = 'Toca un sismo para ver su información.'; drawMap(); renderFeed(); stats();
    }).catch(() => { $('upd').textContent = 'sin conexión, mostrando ejemplos'; $('upd').parentNode.classList.add('off'); $('info').textContent = 'No se pudo conectar con el USGS. Se muestran sismos de ejemplo.'; drawMap(); renderFeed(); });
}
load(); setInterval(load, 60000);
