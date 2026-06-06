// Vercel serverless function — traduz PT→EN para o admin.
// Chamada do navegador do admin (mesmo domínio → sem CORS) no momento de publicar.
// Usa DeepL se DEEPL_API_KEY estiver configurada nas env vars; caso contrário
// cai num endpoint gratuito do Google translate (funciona sem nenhuma chave).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // body pode vir como objeto (Vercel parseia JSON) ou string
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const texts = Array.isArray(body.texts) ? body.texts : [];
    const target = (body.target || 'EN').toUpperCase();

    if (!texts.length) {
      res.status(200).json({ translations: [] });
      return;
    }

    let translations;
    if (process.env.DEEPL_API_KEY) {
      translations = await translateDeepL(texts, target, process.env.DEEPL_API_KEY);
    } else {
      translations = await translateGoogleFree(texts, target);
    }

    res.status(200).json({ translations });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}

async function translateDeepL(texts, target, key) {
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const params = new URLSearchParams();
  params.set('source_lang', 'PT');
  params.set('target_lang', target);
  texts.forEach(t => params.append('text', t));

  const r = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  if (!r.ok) throw new Error('DeepL ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return (j.translations || []).map(t => t.text);
}

// Fallback gratuito sem chave — endpoint público do Google translate.
// Traduz um item por vez (mantém a ordem). Preserva quebras de linha (\n) e os
// marcadores de destaque *...* dos títulos. Em erro, devolve o original.
async function translateGoogleFree(texts, target) {
  const tl = target.toLowerCase(); // 'en'
  const out = [];
  for (const text of texts) {
    try {
      // traduz linha a linha para manter a estrutura dos títulos empilhados
      const lines = String(text).split('\n');
      const translatedLines = [];
      for (const line of lines) {
        if (!line.trim()) { translatedLines.push(line); continue; }
        translatedLines.push(await translateOneLine(line, tl));
      }
      out.push(translatedLines.join('\n'));
    } catch (e) {
      out.push(text);
    }
  }
  return out;
}

async function translateOneLine(line, tl) {
  // protege o conteúdo entre asteriscos para a marca *...* sobreviver à tradução
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl='
    + encodeURIComponent(tl) + '&dt=t&q=' + encodeURIComponent(line);
  const r = await fetch(url);
  if (!r.ok) return line;
  const j = await r.json();
  const joined = (j[0] || []).map(seg => seg[0]).join('');
  return joined || line;
}
