const $ = id => document.getElementById(id);
/* Fondo de nodos */
const nc = $('net'), nx = nc.getContext('2d'); let nodes = [];
function initNet() { const r = nc.getBoundingClientRect(), d = devicePixelRatio || 1; nc.width = r.width * d; nc.height = r.height * d; nodes = Array.from({ length: Math.min(70, Math.round(nc.width / 28)) }, () => ({ x: Math.random() * nc.width, y: Math.random() * nc.height, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5 })); }
function netLoop() {
  nx.clearRect(0, 0, nc.width, nc.height); const L = 150 * (devicePixelRatio || 1);
  nodes.forEach((a, i) => { a.x = (a.x + a.vx + nc.width) % nc.width; a.y = (a.y + a.vy + nc.height) % nc.height; nx.fillStyle = '#7fd8ff55'; nx.beginPath(); nx.arc(a.x, a.y, 1.8, 0, 7); nx.fill();
    for (let j = i + 1; j < nodes.length; j++) { const b = nodes[j], k = Math.hypot(a.x - b.x, a.y - b.y); if (k < L) { nx.strokeStyle = `rgba(127,216,255,${.16 * (1 - k / L)})`; nx.beginPath(); nx.moveTo(a.x, a.y); nx.lineTo(b.x, b.y); nx.stroke(); } } });
  requestAnimationFrame(netLoop);
}
initNet(); netLoop(); addEventListener('resize', initNet);

/* Simulacro */
const dsteps = [[0, 'Tiembla. Gritar "¡Sismo!" y alejarte de ventanas.'], [5, 'AGÁCHATE: al suelo, sobre manos y rodillas.'], [10, 'CÚBRETE: cabeza y cuello bajo una mesa firme.'], [15, 'SUJÉTATE: agárrate de la pata de la mesa.'], [25, 'Fin del temblor. Espera, revisa si hay heridos y sal con calma por las escaleras.']];
let timer;
$('drill').onclick = () => {
  clearInterval(timer); $('drillbox').hidden = false; let t = 0;
  const tick = () => { const s = dsteps.filter(x => x[0] <= t).pop(); $('dstep').textContent = s[1]; $('dbar').style.width = t / 30 * 100 + '%'; $('drillbox').className = 'glass drill' + (t < 25 ? ' shake' : ''); if (t === 5 && navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]); if (t++ >= 30) { clearInterval(timer); $('dstep').textContent = 'Simulacro completo. Repítelo con tu familia.'; $('drill').textContent = 'Repetir simulacro'; } };
  tick(); timer = setInterval(tick, 1000);
};

/* Fases */
const phases = {
  antes: ['Identifica en cada cuarto un lugar seguro: bajo una mesa resistente o junto a una pared interior.', 'Asegura a la pared estantes, televisores y objetos pesados. Nada pesado sobre las camas.', 'Aprende dónde cortar el gas, el agua y la luz.', 'Prepara la mochila de emergencia y revisa sus fechas.', 'Acuerda con tu familia un punto de encuentro y un contacto fuera de la ciudad.', 'Practica simulacros dos veces al año.'],
  durante: ['Mantén la calma. Agáchate, cúbrete y sujétate.', 'Aléjate de ventanas, espejos y objetos que puedan caer.', 'No corras hacia afuera ni uses el ascensor.', 'Si estás en la cama, quédate y protege tu cabeza con la almohada.', 'No te pares en el marco de una puerta: no es más seguro que una mesa.', 'Si hay un temblor fuerte cerca de la costa, prepárate para evacuar a zona alta.'],
  despues: ['Espera a que pare del todo y revisa si hay heridos. Da primeros auxilios básicos.', 'Usa zapatos cerrados: puede haber vidrios en el piso.', 'Revisa si hay olor a gas, cables caídos o fugas. Si huele a gas, abre ventanas y sal.', 'Sal con calma por las escaleras si el edificio tiene daños.', 'Espera réplicas: repite agacharte, cubrirte y sujetarte.', 'Escribe mensajes en lugar de llamar para no saturar las líneas.', 'Infórmate por fuentes oficiales como el SINAPROC y no difundas rumores.']
};
function showPhase(k) { $('steps').innerHTML = phases[k].map(t => `<li>${t}</li>`).join(''); }
$('phase').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('phase').querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); showPhase(b.dataset.k); };
showPhase('antes');

/* Lugares */
const places = { 'En casa': 'Agáchate junto a una mesa firme o una cama y protégete la cabeza. Aléjate de ventanas y estantes. Al terminar, corta el gas y sal con calma.', 'Edificio alto': 'Cúbrete bajo un escritorio, lejos de las ventanas. No uses el ascensor. Baja por las escaleras cuando el temblor pare. Las alarmas contra incendios pueden activarse.', 'En la calle': 'Aléjate de edificios, postes, cables y cornisas. Ve a un espacio abierto y agáchate protegiéndote la cabeza.', 'En el auto': 'Detente en un lugar abierto, lejos de puentes, túneles y postes. Quédate dentro con el cinturón puesto hasta que termine.', 'En la playa': 'Si el temblor es fuerte o dura más de 20 segundos, no esperes una alerta oficial. Sube de inmediato a terreno alto, lejos de la costa, por posible tsunami.', 'En la escuela o trabajo': 'Cúbrete bajo tu mesa y sigue las instrucciones del encargado. Evacúa en fila por la ruta señalada hacia el punto de encuentro.' };
$('place').innerHTML = Object.keys(places).map((p, i) => `<button class="${i ? '' : 'on'}">${p}</button>`).join('');
const showPlace = p => $('placeinfo').innerHTML = `<h3 style="margin-top:0">${p}</h3><p class="big">${places[p]}</p>`;
$('place').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('place').querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); showPlace(b.textContent); };
showPlace('En casa');

/* Mochila */
const items = ['Agua: 3 litros por persona al día para 3 días', 'Comida enlatada y no perecedera', 'Linterna y pilas de repuesto', 'Radio a pilas', 'Botiquín de primeros auxilios', 'Medicinas personales', 'Documentos en bolsa plástica', 'Dinero en efectivo', 'Cargador portátil', 'Silbato', 'Mascarilla y guantes', 'Ropa abrigada y zapatos cerrados'];
let saved = []; try { saved = JSON.parse(localStorage.getItem('kit') || '[]'); } catch (e) {}
$('ktotal').textContent = items.length;
$('kit').innerHTML = items.map((t, i) => `<label class="glass k"><input type="checkbox" data-i="${i}" ${saved.includes(i) ? 'checked' : ''}> ${t}</label>`).join('');
function upd() { const c = [...document.querySelectorAll('.k input')].filter(x => x.checked); $('kcount').textContent = c.length; $('kbar').style.width = c.length / items.length * 100 + '%'; try { localStorage.setItem('kit', JSON.stringify(c.map(x => +x.dataset.i))); } catch (e) {} }
$('kit').onchange = upd; upd();
