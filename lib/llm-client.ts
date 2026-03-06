const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.26/wasm'

type PendingCall = { resolve: (t: string) => void; reject: (e: Error) => void }

let worker: Worker | null = null
let readyPromise: Promise<void> | null = null
let readyResolve: (() => void) | null = null
let readyReject: ((e: Error) => void) | null = null
let idCounter = 0
const pending = new Map<string, PendingCall>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./llm-worker.ts', import.meta.url))

        worker.onmessage = (e: MessageEvent) => {
            const msg = e.data as { type: string; id?: string; text?: string; message?: string }
            switch (msg.type) {
                case 'ready':
                    readyResolve?.()
                    break
                case 'init-error':
                    readyReject?.(new Error(msg.message))
                    break
                case 'generate-result':
                    if (msg.id) {
                        pending.get(msg.id)?.resolve(msg.text ?? '')
                        pending.delete(msg.id)
                    }
                    break
                case 'generate-error':
                    if (msg.id) {
                        pending.get(msg.id)?.reject(new Error(msg.message))
                        pending.delete(msg.id)
                    }
                    break
            }
        }

        worker.onerror = (err) => {
            readyReject?.(new Error(`Worker error: ${err.message}`))
        }
    }
    return worker
}

/**
 * Initialize the LLM worker with a model file.
 * @param modelBuffer - ArrayBuffer of the .litertlm model file
 *
 * The buffer is transferred (zero-copy) into the worker — the local reference
 * becomes detached after this call, which is normal for large files.
 *
 * Safe to call multiple times; after the first call it returns the same promise.
 */
export async function initLLM(modelBuffer: ReadableStream<Uint8Array>): Promise<void> {
    if (readyPromise) return readyPromise

    readyPromise = new Promise<void>((resolve, reject) => {
        readyResolve = resolve
        readyReject = reject
    })

    const w = getWorker()
    w.postMessage({ type: 'init', payload: { modelStream: modelBuffer, wasmUrl: WASM_URL } }, [modelBuffer])

    return readyPromise
}

/**
 * Run a prompt through the loaded model.
 * Waits for initialization if still in progress.
 * Throws if initLLM() was never called.
 */
export async function generate(prompt: string): Promise<string> {
    if (!readyPromise) throw new Error('Call initLLM() before generate()')
    await readyPromise

    return new Promise<string>((resolve, reject) => {
        const id = String(++idCounter)
        pending.set(id, { resolve, reject })
        getWorker().postMessage({ type: 'generate', id, prompt })
    })
}

/** True after initLLM() has been called (regardless of whether loading finished). */
export function isLLMReady(): boolean {
    return !!readyPromise
}

/**
 * Extract text from a file and run it through the loaded LLM.
 * - PDF: posts the raw bytes to /api/ocr (pdf-parse, server-side)
 * - CSV / ODX / plain text: reads the file directly in the browser
 *
 * The extracted content is embedded in a structured prompt so
 * llmInference.generateResponse() in the worker can process it.
 */
export async function generateFromFile(file: File): Promise<string> {
    let fileText: string

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/pdf' },
            body: file,
        })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error ?? `Falha ao extrair texto do PDF (${res.status})`)
        }
        const data = await res.json()
        fileText = data.text ?? ''
    } else {
        fileText = await file.text()
    }

    if (!fileText.trim()) throw new Error('Nenhum conteúdo legível encontrado no arquivo.')

    const prompt =
        `Você é um assistente financeiro. Analise o conteúdo abaixo extraído de um documento ` +
        `(${file.name}) e extraia todas as transações financeiras identificadas (data, descrição, valor). ` +
        `Retorne as informações de forma estruturada e objetiva.\n\n---\n${fileText}\n---`

    return generate(prompt)
}
