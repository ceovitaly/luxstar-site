// Cloudflare Pages Function for multilingual site copy.
// Add Workers AI binding named AI in Pages project settings.
const languages = {de:'german',it:'italian',es:'spanish',pt:'portuguese',ar:'arabic',tr:'turkish',zh:'chinese',ja:'japanese',th:'thai'};
export async function onRequestPost({request,env}) {
  const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=86400'}});
  if (!env.AI) return json({error:'AI binding not configured'},503);
  if ((request.headers.get('content-type')||'').split(';')[0] !== 'application/json') return json({error:'Expected JSON'},415);
  let data;
  try {data=await request.json();} catch {return json({error:'Invalid JSON'},400);}
  if (!data || !languages[data.language] || !['ru','en'].includes(data.sourceLanguage) || typeof data.text !== 'string' || data.text.length>1800 || !data.text.trim()) return json({error:'Invalid translation request'},400);
  try {
    const result=await env.AI.run('@cf/meta/m2m100-1.2b',{text:data.text,source_lang:data.sourceLanguage==='en'?'english':'russian',target_lang:languages[data.language]});
    const translation=result?.translated_text || result?.translation;
    if (!translation || typeof translation!=='string') return json({error:'Translation failed'},502);
    return json({translation});
  } catch(error) {console.error('Translation failed',error);return json({error:'Translation unavailable'},502);}
}
export function onRequest() {return new Response('Method not allowed',{status:405});}
