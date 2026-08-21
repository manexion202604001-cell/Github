/**
 * LPのHTML書き出し(要件57)。
 * 外部CSSに依存しない自己完結HTMLを生成する。純粋関数。
 */

export type RenderSection = {
  kind: string
  title: string | null
  subtitle: string | null
  body: string | null
  items: { label: string; value: string | null }[]
  imageUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  visible: boolean
}

export type RenderPage = {
  title: string
  headline: string | null
  subheadline: string | null
  sections: RenderSection[]
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

function renderItems(kind: string, items: { label: string; value: string | null }[]): string {
  if (items.length === 0) return ''

  if (kind === 'COMPARISON') {
    return `<table class="cmp"><tbody>${items
      .map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value ?? '')}</td></tr>`)
      .join('')}</tbody></table>`
  }

  if (kind === 'FAQ') {
    return `<dl class="faq">${items
      .map((item) => `<dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value ?? '')}</dd>`)
      .join('')}</dl>`
  }

  return `<ul class="cards">${items
    .map(
      (item) =>
        `<li><span class="label">${escapeHtml(item.label)}</span>${
          item.value ? `<span class="value">${escapeHtml(item.value)}</span>` : ''
        }</li>`,
    )
    .join('')}</ul>`
}

function renderSection(section: RenderSection, index: number): string {
  if (!section.visible) return ''
  const isHero = section.kind === 'HERO'
  const classes = ['section', `section--${section.kind.toLowerCase()}`, index % 2 === 1 ? 'section--alt' : '']
    .filter(Boolean)
    .join(' ')

  return `<section class="${classes}">
  <div class="inner">
    ${section.title ? `<${isHero ? 'h1' : 'h2'}>${escapeHtml(section.title)}</${isHero ? 'h1' : 'h2'}>` : ''}
    ${section.subtitle ? `<p class="sub">${escapeHtml(section.subtitle)}</p>` : ''}
    ${section.imageUrl ? `<img src="${escapeHtml(section.imageUrl)}" alt="${escapeHtml(section.title ?? '')}" loading="lazy">` : ''}
    ${section.body ? paragraphs(section.body) : ''}
    ${renderItems(section.kind, section.items)}
    ${
      section.ctaLabel
        ? `<a class="cta" href="${escapeHtml(section.ctaHref ?? '#')}">${escapeHtml(section.ctaLabel)}</a>`
        : ''
    }
  </div>
</section>`
}

const STYLE = `:root{--bg:#F6F3FF;--bg-alt:#F2EEFA;--card:#FFFFFF;--ink:#111111;--muted:#5B5B66;--purple:#6D4AFF;--purple-sub:#8B72E8;--border:#DDD6F3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.8;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block;border-radius:16px;margin:24px auto}
.section{padding:72px 20px}
.section--alt{background:var(--bg-alt)}
.inner{max-width:880px;margin:0 auto}
h1{font-size:clamp(28px,6vw,46px);line-height:1.35;letter-spacing:-.01em;margin:0 0 16px}
h2{font-size:clamp(22px,4vw,32px);line-height:1.4;margin:0 0 12px}
p{margin:0 0 16px;color:var(--muted)}
.sub{color:var(--purple);font-weight:600}
.cards{list-style:none;padding:0;margin:24px 0;display:grid;gap:12px}
.cards li{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 24px}
.cards .label{display:block;font-weight:700;margin-bottom:4px}
.cards .value{color:var(--muted)}
.cmp{width:100%;border-collapse:separate;border-spacing:0;background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin:24px 0}
.cmp th,.cmp td{padding:14px 20px;text-align:left;border-bottom:1px solid var(--border)}
.cmp tr:last-child th,.cmp tr:last-child td{border-bottom:0}
.cmp th{width:45%;font-weight:600}
.cmp td{color:var(--purple);font-weight:700}
.faq{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:8px 24px;margin:24px 0}
.faq dt{font-weight:700;margin:16px 0 6px}
.faq dd{margin:0 0 16px;color:var(--muted)}
.cta{display:inline-block;background:var(--purple);color:#fff;text-decoration:none;padding:16px 40px;border-radius:999px;font-weight:700;margin-top:16px}
.section--hero{background:var(--card);text-align:center}
.section--cta{text-align:center}
@media(min-width:720px){.cards{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}`

export function renderLandingPageHtml(page: RenderPage): string {
  const sections = page.sections.map(renderSection).join('\n')
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.subheadline ?? '')}">
<style>${STYLE}</style>
</head>
<body>
${sections}
</body>
</html>`
}
