import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read the system prompt from the markdown file
function getSystemPrompt(): string {
  const filePath = join(process.cwd(), 'SYSTEM_PROMPT.md');
  return readFileSync(filePath, 'utf-8');
}

// Get the next sample number by counting existing files
function getNextSampleNumber(): number {
  const sampleDir = join(process.cwd(), 'sample');
  
  // Create sample directory if it doesn't exist
  if (!existsSync(sampleDir)) {
    mkdirSync(sampleDir, { recursive: true });
    return 1;
  }
  
  // Read existing files and find the highest number
  const files = readdirSync(sampleDir);
  const sampleFiles = files.filter(file => file.match(/^sample\d+\.html$/));
  
  if (sampleFiles.length === 0) {
    return 1;
  }
  
  // Extract numbers from filenames and find the max
  const numbers = sampleFiles.map(file => {
    const match = file.match(/^sample(\d+)\.html$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  
  return Math.max(...numbers) + 1;
}

// Save the generated HTML to a file
function saveSample(htmlCode: string): string {
  const sampleDir = join(process.cwd(), 'sample');
  const sampleNumber = getNextSampleNumber();
  const fileName = `sample${sampleNumber}.html`;
  const filePath = join(sampleDir, fileName);
  
  writeFileSync(filePath, htmlCode, 'utf-8');
  
  return fileName;
}

export async function POST(req: Request) {
  try {
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

    const completion = await openai.chat.completions.create({
      messages: messages,
      model: 'gpt-4o', // Switch to 'gpt-4o' for better results if you have budget
      temperature: 0.7, // Creative enough to infer features
    });

    let htmlCode = completion.choices[0].message.content || '';

    // CLEANUP: Remove markdown backticks if the AI adds them
    htmlCode = htmlCode.replace(/```html/g, '').replace(/```/g, '');

    // Save the generated HTML to a file
    const fileName = saveSample(htmlCode);
    console.log(`Saved generated app to: sample/${fileName}`);

    return NextResponse.json({ code: htmlCode, fileName });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return NextResponse.json({ error: 'Failed to generate app' }, { status: 500 });
  }
}

