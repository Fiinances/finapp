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