import * as fs from 'fs'
import * as zlib from 'zlib'
import * as path from 'path'

export function extractAllPages() {
  const htmlPath = path.join(process.cwd(), 'src/assets/logos-app-de-gestao-de-igreja-6af67.html')
  const outDir = path.join(process.cwd(), 'extracted/pages')

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`File not found: ${htmlPath}`)
  }

  const html = fs.readFileSync(htmlPath, 'utf8')

  const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
  if (!manifestMatch) {
    throw new Error('Manifest not found in bundle HTML!')
  }

  const manifest = JSON.parse(manifestMatch[1])

  const pageOrderMatch = html.match(
    /<script type="__bundler\/page_order">\s*([\s\S]*?)\s*<\/script>/,
  )
  const pageOrder = pageOrderMatch ? JSON.parse(pageOrderMatch[1]) : []

  const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)
  const template = templateMatch ? JSON.parse(templateMatch[1]) : ''

  const titlesMap: Record<string, string> = {}
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
    if (!entry) {
      console.warn(`No manifest entry for uuid: ${uuid}`)
      continue
    }

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

    fs.writeFileSync(path.join(outDir, safeFilename), pageHtml, 'utf8')

    const titleTagMatch = pageHtml.match(/<title>([\s\S]*?)<\/title>/i)
    const docTitle = titleTagMatch ? titleTagMatch[1].trim() : ''

    const bodyMatch = pageHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyText = bodyMatch
      ? bodyMatch[1]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 300)
      : ''

    summary.push({
      order: i + 1,
      uuid,
      title,
      docTitle,
      filename: safeFilename,
      path: `extracted/pages/${safeFilename}`,
      bytes: pageHtml.length,
      preview: bodyText,
    })
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'extracted/summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  )

  return summary
}

// If invoked directly
if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].includes('extract-script')
) {
  const result = extractAllPages()
  console.log(`Extracted ${result.length} pages`)
}
