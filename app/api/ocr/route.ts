import { NextRequest, NextResponse } from 'next/server'
import pdf from 'pdf-parse'

export async function POST(req: NextRequest) {
  try {
    const buf = Buffer.from(await req.arrayBuffer())
    const data = await pdf(buf as any)
    const text = data.text || ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('OCR error', err)
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 500 })
  }
}
