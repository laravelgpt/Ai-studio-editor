const defaultJSCode = `// Welcome to AI Studio!
// You can write and execute JavaScript code.
// Use the AI tools in the panel on the right to boost your productivity.

function factorial(n) {
  if (n === 0) {
    return 1;
  }
  return n * factorial(n - 1);
}

const num = 5;
console.log(\`The factorial of \${num} is \${factorial(num)}\`);

// Try selecting a piece of code and clicking "Explain"
// Or introduce an error and click "Fix"
`;

const defaultPythonCode = `# Welcome to AI Studio!
# Python execution is not yet supported in the browser.

def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        print(a, end=' ')
        a, b = b, a + b

fibonacci(10)
`;

const fileStore = new Map<string, string>([
    ['script.js', defaultJSCode],
    ['script.py', defaultPythonCode],
]);

export function saveFile(path: string, content: string): void {
  fileStore.set(path, content);
}

export function readFile(path: string): string | undefined {
  return fileStore.get(path);
}

export function listFiles(): string[] {
  return Array.from(fileStore.keys());
}
