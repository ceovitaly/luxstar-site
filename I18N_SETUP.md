# Multilingual LUXSTAR website
The selector supports **11 languages**: RU, EN, DE, IT, ES, PT, AR, TR, ZH, JA, TH.

- RU is the authored source.
- EN uses an explicit translation dictionary in `js/i18n.js`.
- DE, IT, ES, PT, AR, TR, ZH, JA and TH translate via `POST /api/translate` powered by Cloudflare Workers AI model `@cf/meta/m2m100-1.2b`. The browser caches returned translations. Translation may take time when visitors first select a language; subsequent visits use the saved cache. Automatic translation requires proofreading before public release.
- The whole DOM including form placeholders, accessibility labels, dynamic feedback and HTML title/description is translated without replacing markup. Arabic sets RTL direction.

## Deployment requirement
Publish on Cloudflare Pages with the `functions/` directory and configure an **AI binding named `AI`**. Without that binding the endpoint responds 503 and untranslated locale strings temporarily fall back to English. Static GitHub Pages cannot run this backend.

Test all 11 languages on the deployed preview, including form states, menu, FAQ, RTL layout, mobile and cache reset. Monitor Workers AI pricing/quotas. For predictable production performance, consider generating and reviewing static locale JSON dictionaries instead of on-demand AI translation.
