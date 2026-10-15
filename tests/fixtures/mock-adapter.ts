/** Local scripted adapter: tests never call a model provider. */
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelReasoningInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'

export function textResponse(text: string): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'usage', usage: { inputTokens: 10, outputTokens: text.length } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}
export function toolCallResponse(id: string, name: string, args: object): StreamChunk[] {
  const callId = ToolCallId(id)
  const argumentsJson = JSON.stringify(args)
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 0, id: callId, name, argumentsDelta: argumentsJson },
    { type: 'block-end', index: 0, block: { type: 'tool-call', id: callId, name, arguments: argumentsJson } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}
export class MockAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  constructor(
    private readonly script: (StreamChunk[] | ((options: GenerateOptions) => StreamChunk[]))[],
    /**
     * Reasoning efforts this fake route declares. Omitting them makes every
     * configured effort fail the LLM layer's support check, which is exactly
     * what a test asserting that failure needs.
     */
    private readonly model: LlmModelReasoningInfo | undefined = undefined,
  ) { super() }
  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      ...this.model === undefined ? {} : { reasoning: this.model },
    })
  }
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const entry = this.script.shift()
    if (entry === undefined) throw new Error('MockAdapter: script exhausted')
    for (const chunk of typeof entry === 'function' ? entry(options) : entry) {
      options.signal?.throwIfAborted()
      yield chunk
    }
  }
}
