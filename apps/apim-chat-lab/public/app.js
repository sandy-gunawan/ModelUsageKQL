const byId = (id) => document.getElementById(id);
const show = (id, value) => { byId(id).textContent = value ?? '–'; };
const send = byId('send');
const form = byId('chat');
const answer = byId('answer');

async function loadConfig() {
  try {
    const reply = await fetch('/api/config', { redirect: 'error' });
    if (!reply.ok) throw new Error('Config unavailable');
    const config = await reply.json();
    show('app-name', `${config.label} · Chat lewat APIM`);
    show('endpoint', config.baseUrl || 'Gateway belum tersambung');
    show('project', config.project || 'Belum dikonfigurasi');
    show('deployment', config.model || 'Belum dikonfigurasi');
    show('state', config.ready ? 'Siap diuji' : 'Menunggu APIM');
    byId('state').dataset.ready = config.ready;
    send.disabled = !config.ready;
  } catch {
    show('state', 'Koneksi belum tersedia');
    show('result-status', 'Tidak dapat memuat konfigurasi. Muat ulang halaman atau masuk kembali.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (send.disabled) return;
  send.disabled = true;
  form.setAttribute('aria-busy', 'true');
  show('result-status', 'Sedang menunggu jawaban…');
  byId('result-status').dataset.error = 'false';
  answer.hidden = true;
  answer.textContent = '';
  for (const id of ['input-tokens', 'output-tokens', 'total-tokens', 'duration', 'request-id']) show(id, null);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: byId('question').value }),
      redirect: 'error',
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      byId('result-status').dataset.error = 'true';
      show('result-status', response.status === 401 || response.status === 403
        ? `HTTP ${response.status} · Web App menolak akses. Muat ulang halaman atau masuk kembali.`
        : `HTTP ${response.status} · Web App tidak mengirim respons JSON.`);
      return;
    }
    const result = await response.json();
    show('request-id', result.requestId);
    if (Number.isFinite(result.elapsedMs)) show('duration', `${result.elapsedMs} ms`);
    byId('result-status').dataset.error = String(!response.ok);
    if (!response.ok) {
      show('result-status', `HTTP ${response.status} · ${result.message ?? 'Request tidak berhasil.'}`);
      return;
    }
    show('result-status', `HTTP ${response.status} · ${result.answer ? 'Jawaban diterima' : 'Model tidak memberi jawaban teks'}${result.finish === 'length' ? ' (batas output tercapai)' : ''}`);
    if (result.answer) {
      answer.textContent = result.answer;
      answer.hidden = false;
    }
    show('input-tokens', result.usage?.input);
    show('output-tokens', result.usage?.output);
    show('total-tokens', result.usage?.total);
  } catch {
    byId('result-status').dataset.error = 'true';
    show('result-status', 'Gagal menerima hasil. Periksa koneksi atau masuk kembali.');
  } finally {
    form.removeAttribute('aria-busy');
    send.disabled = false;
  }
});

loadConfig();
