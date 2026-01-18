import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Read the system prompt from the markdown file
function getSystemPrompt(): string {
  const filePath = join(process.cwd(), 'SYSTEM_PROMPT.md');
  return readFileSync(filePath, 'utf-8');
}

// Note: File saving removed for Vercel compatibility (serverless functions have read-only filesystem)
// The generated code is saved in localStorage on the client side instead

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const { prompt, existingCode, isEdit } = await req.json();

    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const systemPrompt = getSystemPrompt();
    
    let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (isEdit && existingCode) {
      // EDIT MODE: Provide context about editing existing code
      messages.push({
        role: 'user',
        content: `Here is an existing app code:\n\n${existingCode}\n\nUser wants to edit it with this request: ${prompt}\n\nPlease update the existing code to incorporate the requested changes. Make sure to preserve all existing functionality unless the user explicitly asks to change or remove it.`,
      });
    } else {
      // CREATE MODE: Normal generation
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    const stream = await openai.chat.completions.create({
      messages: messages,
      model: 'gpt-4.1', // Switch to 'gpt-4o' for better results if you have budget
      temperature: 0.7, // Creative enough to infer features
      stream: true,
    });

    // Create a ReadableStream to send chunks to the client
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              // Send each chunk to the client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: content, done: false })}\n\n`));
            }
          }

          // CLEANUP: Remove markdown backticks if the AI adds them
          let htmlCode = fullContent.replace(/```html/g, '').replace(/```/g, '');

          // Note: File saving removed for Vercel compatibility
          // The code is saved in localStorage on the client side instead

          // Send final message with complete code
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: '', done: true, code: htmlCode })}\n\n`));
          controller.close();
        } catch (streamError) {
          console.error('Streaming error:', streamError);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate app', done: true })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return NextResponse.json({ error: 'Failed to generate app' }, { status: 500 });
  }
}

