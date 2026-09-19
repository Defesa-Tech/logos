const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const htmlPath = path.join(process.cwd(), 'src/assets/logos-app-de-gestao-de-igreja-6af67.html')
const outDir = path.join(process.cwd(), 'extracted/pages')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

if (!fs.existsSync(htmlPath)) {
  console.error('File not found:', htmlPath)
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')

const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
const manifest = manifestMatch ? JSON.parse(manifestMatch[1]) : {}

const pageOrderMatch = html.match(/<script type="__bundler\/page_order">\s*([\s\S]*?)\s*<\/script>/)
const pageOrder = pageOrderMatch ? JSON.parse(pageOrderMatch[1]) : []

const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)
const template = templateMatch ? JSON.parse(templateMatch[1]) : ''

const titlesMap = {}
for (const match of template.matchAll(
  /<h2>(.*?)<\/h2><iframe[^>]*src="about:blank#([a-f0-9-]+)"/g,
)) {
  titlesMap[match[2]] = match[1].replace(/<[^>]+>/g, '').trim()
}
if (Object.keys(titlesMap).length === 0) {
  for (const match of template.matchAll(
    /<h2>(.*?)<\\\/h2><iframe[^>]*src=\\"about:blank#([a-f0-9-]+)\\"/g,
  )) {
    titlesMap[match[2]] = match[1].replace(/<[^>]+>/g, '').trim()
  }
}

const summary = []
for (let i = 0; i < pageOrder.length; i++) {
  const uuid = pageOrder[i]
  const title = titlesMap[uuid] || `page_${i + 1}`
  const entry = manifest[uuid]
  if (!entry) continue

  let buffer = Buffer.from(entry.data, 'base64')
  if (entry.compressed) {
    buffer = zlib.gunzipSync(buffer)
  }
  const pageHtml = buffer.toString('utf8')
  const cleanTitle = title
    .replace(/[^\w\s\u00C0-\u017F-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
  const safeFilename = `${String(i + 1).padStart(2, '0')}_${cleanTitle || 'pagina'}.html`

  fs.writeFileSync(path.join(outDir, safeFilename), pageHtml)

  const bodyTextMatch = pageHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  const preview = bodyTextMatch
    ? bodyTextMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    : ''

  summary.push({
    order: i + 1,
    uuid,
    title,
    filename: safeFilename,
    path: `extracted/pages/${safeFilename}`,
    bytes: pageHtml.length,
    preview,
  })
}

fs.writeFileSync(
  path.join(process.cwd(), 'extracted/summary.json'),
  JSON.stringify(summary, null, 2),
)
console.log('Extracted', summary.length, 'pages into extracted/pages.')
