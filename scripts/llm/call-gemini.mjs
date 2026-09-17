#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function parseArgs(argv) {
  const args = { prompt: null, promptFile: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--prompt') {
      args.prompt = argv[i + 1];
      i += 1;
    } else if (arg === '--prompt-file') {
      args.promptFile = argv[i + 1];
      i += 1;
    }
  }

  if (!args.prompt && !args.promptFile) {
    throw new Error('Usage: call-gemini.mjs --prompt "..." | --prompt-file <path>');
  }

  return args;
}

async function resolvePrompt(args) {
  if (args.prompt) return args.prompt;
  return readFile(args.promptFile, 'utf8');
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body?.error?.message || `Gemini API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API response did not contain any text');
  }

  return text.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prompt = await resolvePrompt(args);
  const result = await callGemini(prompt);
  console.log(result);
}

main();
