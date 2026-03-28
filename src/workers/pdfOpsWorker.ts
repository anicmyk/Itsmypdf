// PDF operations worker: merge single, split by markers, export selected
import { PDFDocument, degrees } from 'pdf-lib'
import JSZip from 'jszip'

type PageItem = {
  id: string
  fileId: string | 'blank'
  pageIndex: number
  rotation: number
  isSelected?: boolean
  splitAfter?: boolean
}

type BuffEntry = { id: string, buffer: ArrayBuffer }

self.onmessage = async (e: MessageEvent) => {
  const data = e.data as { type: 'single' | 'markers' | 'selected', pages: PageItem[], buffers: BuffEntry[], prefix?: string }
  try {
    const docs = new Map<string, PDFDocument>()
    for (const b of data.buffers) {
      const doc = await PDFDocument.load(b.buffer)
      docs.set(b.id, doc)
    }
    if (data.type === 'single') {
      const out = await PDFDocument.create()
      let defaultSize: { width: number, height: number } | null = null
      for (const p of data.pages) {
        if (p.fileId === 'blank') {
          const w = defaultSize?.width ?? 595; const h = defaultSize?.height ?? 842
          const blank = out.addPage([w, h])
          if (p.rotation) blank.setRotation(degrees(p.rotation))
          continue
        }
        const src = docs.get(p.fileId as string); if (!src) continue
        const [copied] = await out.copyPages(src, [p.pageIndex])
        out.addPage(copied)
        const added = out.getPage(out.getPageCount() - 1)
        if (p.rotation) added.setRotation(degrees(p.rotation))
        if (!defaultSize) { const s = added.getSize(); defaultSize = { width: s.width, height: s.height } }
      }
      const bytes = await out.save({ useObjectStreams: true })
      ;(self as any).postMessage({ ok: true, kind: 'single', bytes })
      return
    }
    if (data.type === 'selected') {
      const out = await PDFDocument.create()
      let defaultSize: { width: number, height: number } | null = null
      for (const p of data.pages.filter(x => x.isSelected)) {
        if (p.fileId === 'blank') {
          const w = defaultSize?.width ?? 595; const h = defaultSize?.height ?? 842
          const blank = out.addPage([w, h])
          if (p.rotation) blank.setRotation(degrees(p.rotation))
          continue
        }
        const src = docs.get(p.fileId as string); if (!src) continue
        const [copied] = await out.copyPages(src, [p.pageIndex])
        out.addPage(copied)
        const added = out.getPage(out.getPageCount() - 1)
        if (p.rotation) added.setRotation(degrees(p.rotation))
        if (!defaultSize) { const s = added.getSize(); defaultSize = { width: s.width, height: s.height } }
      }
      const bytes = await out.save({ useObjectStreams: true })
      ;(self as any).postMessage({ ok: true, kind: 'single', bytes })
      return
    }
    if (data.type === 'markers') {
      const segments: PageItem[][] = []
      let cur: PageItem[] = []
      for (const p of data.pages) {
        cur.push(p)
        if (p.splitAfter) { segments.push(cur); cur = [] }
      }
      if (cur.length) segments.push(cur)
      if (segments.length <= 1) {
        ;(self as any).postMessage({ ok: false, reason: 'no_segments' })
        return
      }
      const zip = new JSZip()
      for (let idx = 0; idx < segments.length; idx++) {
        const out = await PDFDocument.create()
        let defaultSize: { width: number, height: number } | null = null
        for (const p of segments[idx]) {
          if (p.fileId === 'blank') {
            const w = defaultSize?.width ?? 595; const h = defaultSize?.height ?? 842
            const blank = out.addPage([w, h])
            if (p.rotation) blank.setRotation(degrees(p.rotation))
            continue
          }
          const src = docs.get(p.fileId as string); if (!src) continue
          const [copied] = await out.copyPages(src, [p.pageIndex])
          out.addPage(copied)
          const added = out.getPage(out.getPageCount() - 1)
          if (p.rotation) added.setRotation(degrees(p.rotation))
          if (!defaultSize) { const s = added.getSize(); defaultSize = { width: s.width, height: s.height } }
        }
        const bytes = await out.save({ useObjectStreams: true })
        zip.file(`${data.prefix || 'multi'}-${idx + 1}.pdf`, bytes)
      }
      const zipBytes = await zip.generateAsync({ type: 'arraybuffer' })
      ;(self as any).postMessage({ ok: true, kind: 'zip', bytes: zipBytes })
      return
    }
  } catch (err) {
    ;(self as any).postMessage({ ok: false, error: String(err) })
  }
}