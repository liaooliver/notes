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

const RATE_LIMIT_FALLBACK = '_(LLM 建議暫時不可用：Gemini 免費額度已達上限，請稍後再試)_';
const GENERIC_FALLBACK = '_(LLM 建議暫時不可用：呼叫 Gemini API 時發生錯誤)_';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function callGeminiWithRetry(prompt) {
  try {
    return await callGemini(prompt);
  } catch (error) {
    if (error.status === 429) {
      console.error('Gemini rate limit hit, retrying once after backoff...');
      await sleep(5000);
      try {
        return await callGemini(prompt);
      } catch (retryError) {
        if (retryError.status === 429) {
          console.error(retryError.message);
          return RATE_LIMIT_FALLBACK;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prompt = await resolvePrompt(args);

  try {
    const result = await callGeminiWithRetry(prompt);
    console.log(result);
  } catch (error) {
    console.error(error.message);
    console.log(GENERIC_FALLBACK);
  }
}

main();
