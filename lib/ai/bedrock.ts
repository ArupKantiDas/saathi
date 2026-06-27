/**
 * AWS Bedrock provider — PRIMARY LLM.
 *
 * Uses Claude 3.5 Sonnet via the Bedrock Converse API. Structured output is
 * obtained through native tool-use (toolChoice forces the model to "call" a
 * single tool whose input schema IS our JSON Schema), which is far more
 * reliable than parsing free-form text and is central to our anti-hallucination
 * design: the model can only return fields we defined.
 */
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

const region = process.env.AWS_REGION || 'ap-south-1';
const modelId =
  process.env.BEDROCK_MODEL_ID ||
  'apac.anthropic.claude-3-5-sonnet-20241022-v2:0';

// Reuse one client across invocations (connection pooling on warm lambdas).
const client = new BedrockRuntimeClient({ region });

export interface StructuredArgs {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface TextArgs {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/** Force a structured JSON object out of Claude via tool-use. */
export async function bedrockStructured(
  args: StructuredArgs,
): Promise<unknown> {
  const res = await client.send(
    new ConverseCommand({
      modelId,
      system: [{ text: args.system }],
      messages: [{ role: 'user', content: [{ text: args.prompt }] }],
      inferenceConfig: {
        maxTokens: args.maxTokens ?? 1024,
        temperature: args.temperature ?? 0.3,
      },
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name: 'respond',
              description:
                'Return the analysis strictly using this schema. Do not add fields.',
              inputSchema: { json: args.jsonSchema },
            },
          },
        ],
        toolChoice: { tool: { name: 'respond' } },
      },
    }),
  );

  const content = res.output?.message?.content ?? [];
  const toolUse = content.find((c) => 'toolUse' in c)?.toolUse;
  if (!toolUse?.input) {
    throw new Error('bedrock: no toolUse block in response');
  }
  return toolUse.input;
}

/** Plain text completion (for the conversational companion). */
export async function bedrockText(args: TextArgs): Promise<string> {
  const res = await client.send(
    new ConverseCommand({
      modelId,
      system: [{ text: args.system }],
      messages: [{ role: 'user', content: [{ text: args.prompt }] }],
      inferenceConfig: {
        maxTokens: args.maxTokens ?? 700,
        temperature: args.temperature ?? 0.6,
      },
    }),
  );
  const text = res.output?.message?.content?.find((c) => 'text' in c)?.text;
  if (!text) throw new Error('bedrock: empty text response');
  return text.trim();
}
