#!/usr/bin/env node

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('parsed args:', args);
}

main();
