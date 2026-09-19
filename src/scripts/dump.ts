import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'

const htmlPath = path.join(process.cwd(), 'src/assets/logos-app-de-gestao-de-igreja-6af67.html')
const html = fs.readFileSync(htmlPath, 'utf8')
const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
const manifest = JSON.parse(manifestMatch![1])

const targets = {
  14: 'ea5a5b7a-07ec-4b1e-8f15-177f7806f0b0',
  15: '7f4fedef-1985-4271-9659-f1bc38ae7fd3',
  16: '6560502a-a013-45e4-a434-21aa045b8db5',
  17: '72061160-8171-434f-b803-81c716aad788',
}

for (const [num, uuid] of Object.entries(targets)) {
  const entry = manifest[uuid]
  let buffer = Buffer.from(entry.data, 'base64')
  if (entry.compressed) {
    buffer = zlib.gunzipSync(buffer)
  }
  const pageHtml = buffer.toString('utf8')
  fs.writeFileSync(path.join(process.cwd(), `extracted/dump_${num}.html`), pageHtml, 'utf8')
  console.log(`Page ${num} extracted: ${pageHtml.length} chars`)
}
