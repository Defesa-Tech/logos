import fs from 'fs'
import zlib from 'zlib'
import path from 'path'

const htmlPath = path.join(process.cwd(), 'src/assets/logos-app-de-gestao-de-igreja-6af67.html')
const outDir = path.join(process.cwd(), 'extracted_design')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

console.log('Reading HTML...')
const html = fs.readFileSync(htmlPath, 'utf8')

const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
if (!manifestMatch) {
  console.error('Manifest not found!')
  process.exit(1)
}

const manifest = JSON.parse(manifestMatch[1])
console.log('Manifest entries:', Object.keys(manifest).length)

const pageOrderMatch = html.match(/<script type="__bundler\/page_order">\s*([\s\S]*?)\s*<\/script>/)
const pageOrder = pageOrderMatch ? JSON.parse(pageOrderMatch[1]) : []
console.log('Page order entries:', pageOrder.length)

const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)
let template = templateMatch ? JSON.parse(templateMatch[1]) : ''

// Map UUIDs to titles from the template
const titlesMap = {}
for (const match of template.matchAll(/<h2>(.*?)<\/h2><iframe src="about:blank#(.*?)"/g)) {
  titlesMap[match[2]] = match[1].replace(/<\/?h2>/g, '').trim()
}

console.log('Extracted titles count:', Object.keys(titlesMap).length)

const summary = []

for (let i = 0; i < pageOrder.length; i++) {
  const uuid = pageOrder[i]
  const title = titlesMap[uuid] || `page_${i}`
  const entry = manifest[uuid]
  if (!entry) {
    console.warn(`No manifest entry for ${uuid}`)
    continue
  }

  let buffer = Buffer.from(entry.data, 'base64')
  if (entry.compressed) {
    buffer = zlib.gunzipSync(buffer)
  }
  const pageHtml = buffer.toString('utf8')

  // Clean title for filename
  const safeTitle = `${String(i + 1).padStart(2, '0')}_${title.replace(/[\s·/\\:]+/g, '_')}.html`
  fs.writeFileSync(path.join(outDir, safeTitle), pageHtml)

  summary.push({
    index: i + 1,
    uuid,
    title,
    filename: safeTitle,
    length: pageHtml.length,
  })
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
console.log('Extracted all pages to', outDir)
