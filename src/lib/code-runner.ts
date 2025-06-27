export const runJavascript = (code: string): Promise<string[]> => {
  return new Promise((resolve) => {
    const output: string[] = [];
    
    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;

    // Helper to stringify arguments
    const formatArgs = (args: any[]): string => {
      return args.map(arg => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Circular Object]';
          }
        }
        return String(arg);
      }).join(' ');
    };

    // Override console methods
    console.log = (...args: any[]) => {
      output.push(formatArgs(args));
    };
    console.error = (...args: any[]) => {
      output.push(`ERROR: ${formatArgs(args)}`);
    };
    console.warn = (...args: any[]) => {
      output.push(`WARN: ${formatArgs(args)}`);
    };
    console.info = (...args: any[]) => {
      output.push(`INFO: ${formatArgs(args)}`);
    };
    
    // Create a cleanup function
    const cleanup = () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
    };

    try {
      // Use Function constructor for better isolation than eval
      new Function(code)();
    } catch (e: any) {
      output.push(`EXECUTION ERROR: ${e.message}`);
    } finally {
      cleanup();
      resolve(output);
    }
  });
};
