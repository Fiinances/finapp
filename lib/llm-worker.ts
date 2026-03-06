/// <reference lib="webworker" />
import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai'

let llmInference: LlmInference | null = null



type payload = {
    wasmUrl: string
    modelStream: ReadableStream<Uint8Array>
}

self.onmessage = async (e: MessageEvent) => {
    const { type, id, payload } = e.data as { type: string; id?: string; payload?: payload }

    switch (type) {
        case 'init': {
            const { wasmUrl, modelStream } = payload as payload
            try {
                const genaiFileset = await FilesetResolver.forGenAiTasks(wasmUrl)
                llmInference = await LlmInference.createFromOptions(genaiFileset, {
                    baseOptions: { modelAssetBuffer: modelStream.getReader() }, maxTokens: 20480,
                })
                self.postMessage({ type: 'ready' })
            } catch (err) {
                self.postMessage({ type: 'init-error', message: String(err) })
            }
            break
        }

        case 'generate': {
            const { prompt } = e.data as { id: string; prompt: string }
            if (!llmInference) {
                self.postMessage({ type: 'generate-error', id, message: 'LLM not initialized' })
                return
            }
            try {
                const text = await llmInference.generateResponse(prompt)
                self.postMessage({ type: 'generate-result', id, text })
            } catch (err) {
                self.postMessage({ type: 'generate-error', id, message: String(err) })
            }
            break
        }
    }
}
