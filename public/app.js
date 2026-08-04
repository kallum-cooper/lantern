let snapshot;
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
const relativeTime = (date) => { const minutes = Math.max(1, Math.round((Date.now() - new Date(date)) / 60000)); return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`; };
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2500); }
function render() {
  const { counts, networks, changes, racks, devices, discoveries } = snapshot;
  $('#nav-discovery-count').textContent = counts.discoveries;
  $('#scan-network').innerHTML = networks.map((network) => `<option value="${network.id}">${escapeHtml(network.name)} · ${escapeHtml(network.cidr)}</option>`).join('');
  $('#metrics').innerHTML = [['DEVICES', counts.devices, '↗  All accounted for', '⌁'], ['IP ADDRESSES', counts.addresses, `${counts.networks} networks tracked`, '⌁'], ['RACKS', counts.racks, 'Across 1 site', '▦'], ['TO REVIEW', counts.discoveries, counts.discoveries ? 'New observations' : 'All caught up', '◎']].map(([label, value, note, icon]) => `<div class="metric"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`).join('');
  $('#changes').innerHTML = changes.length ? changes.slice(0, 5).map((change) => `<div class="activity-item"><span class="event-dot"></span><div class="activity-copy"><strong>${escapeHtml(change.message)}</strong><small>${escapeHtml(change.type)} event</small></div><span class="time">${relativeTime(change.at)}</span></div>`).join('') : '<div class="empty">No changes yet.</div>';
  $('#networks').innerHTML = networks.map((network) => { const percent = network.capacity ? Math.min(100, Math.round(network.addressCount / network.capacity * 100)) : 0; return `<div class="network-row"><div class="network-label"><strong>${escapeHtml(network.name)}</strong><span>${network.addressCount} / ${network.capacity} used</span></div><div class="progress"><i style="width:${Math.max(3, percent)}%"></i></div></div>`; }).join('');
  $('#rack-mini').innerHTML = racks.map((rack) => `<div class="mini-rack"><div class="mini-rack-label"><strong>${escapeHtml(rack.name)}</strong><small>${rack.devices.length} device${rack.devices.length === 1 ? '' : 's'} · ${rack.height}U</small></div><div class="mini-slots">${Array.from({ length: 8 }, (_, index) => `<span class="mini-slot ${rack.devices[index] ? (index % 3 === 0 ? 'blue' : 'filled') : ''}"></span>`).join('')}</div></div>`).join('');
  $('#ipam-table').innerHTML = networks.map((network) => `<tr><td><strong>${escapeHtml(network.name)}</strong><br><span class="muted">${escapeHtml(network.cidr)}</span></td><td>${network.vlan ?? '—'}</td><td>Home Lab</td><td>${network.addressCount}</td><td>${network.capacity}</td><td><span class="pill">Healthy</span></td></tr>`).join('');
  $('#rack-grid').innerHTML = racks.map((rack) => `<article class="rack-card"><h3>${escapeHtml(rack.name)}</h3><p>Home Lab · ${rack.height}U rack · front elevation</p><div class="rack-body"><div class="rack-labels">${Array.from({ length: 12 }, (_, i) => `<span>${rack.height - i}</span>`).join('')}</div><div class="rack-face">${Array.from({ length: 12 }, (_, i) => { const device = rack.devices.find((item) => item.rackUnit === rack.height - i); return `<div class="rack-unit ${device ? `device ${i % 2 ? 'blue' : ''}` : ''}">${device ? `<span>${escapeHtml(device.name)}</span>` : ''}</div>`; }).join('')}</div></div></article>`).join('');
  $('#discovery-list').innerHTML = discoveries.filter((item) => item.status === 'pending').length ? discoveries.filter((item) => item.status === 'pending').map((item) => `<div class="discovery-card"><div class="discovery-symbol">◎</div><div class="discovery-copy"><strong>${escapeHtml(item.hostname || item.ip)}</strong><small>${escapeHtml(item.ip)} · ${escapeHtml(item.vendor)} · observed ${relativeTime(item.discoveredAt)}</small></div><button class="button secondary confirm-discovery" data-id="${item.id}">Confirm device</button></div>`).join('') : '<div class="empty">No pending discoveries. Run a scan when you are ready.</div>';
  document.querySelectorAll('.confirm-discovery').forEach((button) => button.addEventListener('click', () => confirmDiscovery(button.dataset.id)));
}
async function refresh() { const response = await fetch('/api/summary'); snapshot = await response.json(); render(); }
async function scan(networkId = $('#scan-network').value || snapshot.networks[0]?.id) { const network = snapshot.networks.find((item) => item.id === networkId); if (!network) return toast('Create a network before scanning.'); toast(`Scanning ${network.name}…`); const response = await fetch('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ networkId: network.id }) }); if (!response.ok) return toast('Scan failed. Check the server logs.'); await refresh(); toast('Scan complete. Review the observations.'); }
async function confirmDiscovery(id) { const item = snapshot.discoveries.find((entry) => entry.id === id); const response = await fetch(`/api/discoveries/${id}/confirm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: item.hostname || item.ip }) }); if (response.ok) { await refresh(); toast('Added to your inventory.'); } }
async function addDevice() {
  const name = window.prompt('Device name');
  if (!name?.trim()) return;
  const role = window.prompt('Role (router, server, switch…)') || 'Unassigned';
  const rack = snapshot.racks[0];
  const rackUnit = window.prompt(`Rack unit in ${rack?.name || 'no rack'} (leave blank for standalone)`);
  const ip = window.prompt('IP address (leave blank to assign later)');
  const response = await fetch('/api/devices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, role, rackId: rackUnit && rack ? rack.id : null, rackUnit, ip, networkId: ip ? snapshot.networks[0]?.id : null }) });
  if (response.ok) { await refresh(); toast(`${name} added to inventory.`); } else { const result = await response.json(); toast(result.error || 'Could not add device.'); }
}
async function addNetwork() {
  const name = window.prompt('Network name');
  if (!name?.trim()) return;
  const cidr = window.prompt('CIDR (for example 192.168.10.0/24)');
  if (!cidr?.trim()) return;
  const vlan = window.prompt('VLAN number (optional)');
  const response = await fetch('/api/networks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, cidr, vlan }) });
  if (response.ok) { await refresh(); toast(`${name} added to IPAM.`); } else { const result = await response.json(); toast(result.error || 'Could not add network.'); }
}
function showView(view) { document.querySelectorAll('.view').forEach((node) => node.classList.remove('active-view')); $(`#view-${view}`).classList.add('active-view'); document.querySelectorAll('.nav-item').forEach((node) => node.classList.toggle('active', node.dataset.view === view)); const label = view === 'racks' ? 'RACKS & MAP' : view.toUpperCase(); $('#page-label').textContent = label; $('#page-title').innerHTML = view === 'overview' ? 'Good evening, Kallum <span>✦</span>' : `${label[0] + label.slice(1).toLowerCase()} <span>✦</span>`; }
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewLink)));
$('#add-device').addEventListener('click', addDevice); $('#add-device-rack').addEventListener('click', addDevice); $('#add-network').addEventListener('click', addNetwork); $('#scan-quick').addEventListener('click', () => scan(snapshot.networks[0]?.id)); $('#scan-ipam').addEventListener('click', () => scan(snapshot.networks[0]?.id)); $('#scan-discovery').addEventListener('click', () => scan());
refresh().catch(() => toast('Lantern API is unavailable. Start the server first.'));
