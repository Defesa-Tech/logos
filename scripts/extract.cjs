const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const fs = require('fs')
throw new Error('TESTING_IF_TEST_RUNS')

const pageOrderMatch = html.match(/<script type="__bundler\/page_order">\s*([\s\S]*?)\s*<\/script>/)
const pageOrder = pageOrderMatch ? JSON.parse(pageOrderMatch[1]) : []

const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)
const template = templateMatch ? JSON.parse(templateMatch[1]) : ''

const titlesMap = {}
for (const match of template.matchAll(/<h2>(.*?)<\/h2><iframe src="about:blank#(.*?)"/g)) {
  titlesMap[match[2]] = match[1].replace(/<\/?h2>/g, '').trim()
}

const summary = []
for (let i = 0; i < pageOrder.length; i++) {
  const uuid = pageOrder[i]
  const title = titlesMap[uuid] || `page_${i}`
  const entry = manifest[uuid]
  if (!entry) continue

  let buffer = Buffer.from(entry.data, 'base64')
  if (entry.compressed) {
    buffer = zlib.gunzipSync(buffer)
  }
  const pageHtml = buffer.toString('utf8')
  const safeTitle = `${String(i + 1).padStart(2, '0')}_${title.replace(/[\s·/\\:]+/g, '_')}.html`
  fs.writeFileSync(path.join(outDir, safeTitle), pageHtml)

  const bodyTextMatch = pageHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  const preview = bodyTextMatch
    ? bodyTextMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
    : ''

  summary.push({
    index: i + 1,
    uuid,
    title,
    filename: safeTitle,
    length: pageHtml.length,
    preview,
  })
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
console.log('Extracted', summary.length, 'pages into extracted_mockup.')
