import { test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'

test('extract pages from bundle html', () => {
  const htmlPath = path.join(process.cwd(), 'src/assets/logos-app-de-gestao-de-igreja-6af67.html')
  const outDir = path.join(process.cwd(), 'extracted/pages')

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  expect(fs.existsSync(htmlPath)).toBe(true)
  const html = fs.readFileSync(htmlPath, 'utf8')

  const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
  expect(manifestMatch).not.toBeNull()
  const manifest = JSON.parse(manifestMatch![1])

  const pageOrderMatch = html.match(
    /<script type="__bundler\/page_order">\s*([\s\S]*?)\s*<\/script>/,
  )
  expect(pageOrderMatch).not.toBeNull()
  const pageOrder = JSON.parse(pageOrderMatch![1])
  expect(pageOrder.length).toBe(25)

  const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)
  expect(templateMatch).not.toBeNull()
  const template = JSON.parse(templateMatch![1])

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

  const extractedPages: string[] = []
  const summary: Array<{
    order: number
    uuid: string
    title: string
    docTitle: string
    filename: string
    path: string
    bytes: number
  }> = []

  for (let i = 0; i < pageOrder.length; i++) {
    const uuid = pageOrder[i]
    const title = titlesMap[uuid] || `page_${i + 1}`
    const entry = manifest[uuid]
    expect(entry).toBeDefined()

    let buffer = Buffer.from(entry.data, 'base64')
    if (entry.compressed) {
      buffer = zlib.gunzipSync(buffer)
    }
    const pageHtml = buffer.toString('utf8')
    expect(pageHtml.length).toBeGreaterThan(500)

    const cleanTitle = title
      .replace(/[^\w\s\u00C0-\u017F-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '_')
    const safeFilename = `${String(i + 1).padStart(2, '0')}_${cleanTitle || 'pagina'}.html`

    fs.writeFileSync(path.join(outDir, safeFilename), pageHtml, 'utf8')
    extractedPages.push(safeFilename)

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

  fs.writeFileSync(
    path.join(process.cwd(), 'extracted/summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  )

  expect(extractedPages.length).toBe(25)

  // Verify that all 25 files exist on disk
  const filesOnDisk = fs.readdirSync(outDir).filter((f: string) => f.endsWith('.html'))
  expect(filesOnDisk.length).toBe(25)
  expect(fs.existsSync(path.join(process.cwd(), 'extracted/summary.json'))).toBe(true)
})
