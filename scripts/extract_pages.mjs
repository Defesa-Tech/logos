import fs from 'fs'
import zlib from 'zlib'
import path from 'path'

const htmlPath = path.join(process.cwd(), 'src/assets/logos-app-de-gestao-de-igreja-6af67.html')
const outDir = path.join(process.cwd(), 'extracted/pages')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

console.log('Reading HTML from:', htmlPath)
if (!fs.existsSync(htmlPath)) {
  console.error('File not found:', htmlPath)
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')

const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
if (!manifestMatch) {
  console.error('Manifest not found in bundle HTML!')
  process.exit(1)
}

const manifest = JSON.parse(manifestMatch[1])
console.log('Manifest entries found:', Object.keys(manifest).length)

const pageOrderMatch = html.match(/<script type="__bundler\/page_order">\s*([\s\S]*?)\s*<\/script>/)
const pageOrder = pageOrderMatch ? JSON.parse(pageOrderMatch[1]) : []
console.log('Page order entries:', pageOrder.length)

const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)
const template = templateMatch ? JSON.parse(templateMatch[1]) : ''

const titlesMap = {}
// template contains unescaped string JSON.parse result: <h2>Title</h2><iframe src="about:blank#uuid" ...
for (const match of template.matchAll(
  /<h2>(.*?)<\/h2><iframe[^>]*src="about:blank#([a-f0-9-]+)"/g,
)) {
  titlesMap[match[2]] = match[1].replace(/<[^>]+>/g, '').trim()
}
if (Object.keys(titlesMap).length === 0) {
  // If still escaped in raw string:
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
  if (!entry) {
    console.warn(`No manifest entry for uuid: ${uuid}`)
    continue
  }

  let buffer = Buffer.from(entry.data, 'base64')
  if (entry.compressed) {
    buffer = zlib.gunzipSync(buffer)
  }
  const pageHtml = buffer.toString('utf8')

  // Clean title for safe filename
  const cleanTitle = title
    .replace(/[^\w\s\u00C0-\u017F-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
  const safeFilename = `${String(i + 1).padStart(2, '0')}_${cleanTitle || 'pagina'}.html`

  fs.writeFileSync(path.join(outDir, safeFilename), pageHtml)

  const titleTagMatch = pageHtml.match(/<title>([\s\S]*?)<\/title>/i)
  const docTitle = titleTagMatch ? titleTagMatch[1].trim() : ''

  summary.push({
    order: i + 1,
    uuid,
    title,
    docTitle,
    filename: safeFilename,
    path: `extracted/pages/${safeFilename}`,
    bytes: pageHtml.length,
  })
}

// Write manifest summary
fs.writeFileSync(
  path.join(process.cwd(), 'extracted/summary.json'),
  JSON.stringify(summary, null, 2),
)

console.log(`Successfully extracted ${summary.length} pages to ${outDir}`)
