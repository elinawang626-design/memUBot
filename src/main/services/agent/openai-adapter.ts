import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export async function runOpenAIAdapter(
  client: OpenAI,
  model: string,
  maxTokens: number,
  temperature: number = 0.7,
  systemPrompt: string,
  tools: any[],
  history: Anthropic.MessageParam[]
): Promise<Anthropic.Message> {
  // Conversion Anthropic format tools to OpenAI format
  const openaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  // Conversion Anthropic format messages to OpenAI format
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of history) {
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        messages.push({ role: 'user', content: msg.content });
      } else {
        // Conversion Anthropic format blocks to OpenAI format
        const toolResults = msg.content.filter(b => b.type === 'tool_result') as Anthropic.ToolResultBlockParam[];
        if (toolResults.length > 0) {
          for (const tr of toolResults) {
            messages.push({
              role: 'tool',
              tool_call_id: tr.tool_use_id,
              content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content)
            });
          }
        } else {
          // Processing multimodal graphics and text
          const contentParts = msg.content.map(b => {
            if (b.type === 'text') return { type: 'text', text: b.text };
            if (b.type === 'image') {
              if (b.source.type === 'base64') {
                return { type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
              } else if (b.source.type === 'url') {
                return { type: 'image_url', image_url: { url: b.source.url } };
              }
            }
            return null;
          }).filter(Boolean);
          messages.push({ role: 'user', content: contentParts as any });
        }
      }
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        messages.push({ role: 'assistant', content: msg.content });
      } else {
        // Processing assistant messages with text and tool calls
        const textBlock = msg.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined;
        const toolUses = msg.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
        
        const openaiMsg: OpenAI.Chat.ChatCompletionAssistantMessageParam = { role: 'assistant' };
        if (textBlock) openaiMsg.content = textBlock.text;
        
        if (toolUses.length > 0) {
          openaiMsg.tool_calls = toolUses.map(tu => ({
            id: tu.id,
            type: 'function',
            function: { name: tu.name, arguments: JSON.stringify(tu.input) }
          }));
        }
        messages.push(openaiMsg);
      }
    }
  }

  // Calling OpenAI API to get response
  const completion = await client.chat.completions.create({
    model,
    messages,
    tools: openaiTools.length > 0 ? openaiTools : undefined,
    max_tokens: maxTokens,
    temperature: temperature
  });

  const choice = completion.choices[0];
  const responseMsg = choice.message;

  // Conversion OpenAI format response to Anthropic format
  const contentBlocks: Anthropic.ContentBlock[] = [];
  
  if (responseMsg.content) {
    contentBlocks.push({ type: 'text', text: responseMsg.content } as Anthropic.TextBlock);
  }
  
  if (responseMsg.tool_calls) {
    for (const tc of responseMsg.tool_calls) {
      if (tc.type === 'function') {
        contentBlocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments)
        } as Anthropic.ToolUseBlock);
      }
    }
  }

  const usage = {
    input_tokens: completion.usage?.prompt_tokens || 0,
    output_tokens: completion.usage?.completion_tokens || 0
  } as Anthropic.Usage;

  return {
    id: completion.id,
    type: 'message',
    role: 'assistant',
    content: contentBlocks,
    model: completion.model,
    stop_reason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    stop_sequence: null,
    usage: usage
  };
}