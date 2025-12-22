import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to suppress sourcemap warnings for packages with missing source files
const suppressSourcemapWarnings = () => {
  return {
    name: 'suppress-sourcemap-warnings',
    enforce: 'pre' as const,
    configureServer(server) {
      // Suppress sourcemap warnings in dev server
      server.middlewares.use((req, res, next) => {
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
          const message = args.join(' ');
          // Suppress sourcemap warnings for Metaplex and other packages
          if (
            message.includes('Sourcemap for') && 
            message.includes('points to missing source files')
          ) {
            return;
          }
          originalWarn.apply(console, args);
        };
        next();
      });
    },
    buildStart() {
      // Override console.warn to filter out sourcemap warnings during build
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        // Suppress sourcemap warnings for Metaplex and other packages
        if (
          message.includes('Sourcemap for') && 
          message.includes('points to missing source files')
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };
    },
  };
};

// Plugin to inject Buffer global setup in Solana chunks
// CRITICAL: Buffer must be available globally when solana-core code runs
const setupBufferGlobals = () => {
  return {
    name: 'setup-buffer-globals',
    renderChunk(code, chunk, options) {
      // Handle solana chunk - Buffer is bundled with it, so just set it globally
      if (chunk.name === 'solana') {
        // Fix TDZ errors for require$$2 - make it lazy to avoid accessing encoding$1 before init
        // Replace: const require$$2 = getAugmentedNamespace(encoding$1);
        // With: var require$$2; (lazy getter function that evaluates when called)
        let fixedCode = code.replace(
          /const require\$\$2\s*=\s*\/\*@__PURE__\*\/getAugmentedNamespace\(encoding\$1\);/g,
          'var require$$2=(function(){var _cache;return function(){if(!_cache){if(typeof encoding$1===\'undefined\'){throw new Error(\'Cannot access require$$2: encoding$1 not initialized\');}_cache=getAugmentedNamespace(encoding$1);}return _cache;};})();'
        );
        
        // Fix uses of require$$2 to call it as a function
        // Replace: __importStar(require$$2) with __importStar(require$$2())
        fixedCode = fixedCode.replace(
          /__importStar\(require\$\$2\)/g,
          '__importStar(require$$2())'
        );
        
        // Find all import statements - they end with a newline
        // Match: import ... from '...' followed by newline
        const lines = fixedCode.split('\n');
        let lastImportLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ') && lines[i].includes(' from ')) {
            lastImportLineIndex = i;
          }
        }
        
        // Inject setup code at the VERY BEGINNING, before imports
        // This ensures BN and Buffer are available before class definitions execute
        // CRITICAL: This runs BEFORE imports, so we can only set up from global/polyfill sources
        const setupCodeBefore = `(function(){try{if(typeof globalThis!=='undefined'&&!globalThis.Buffer){try{var bufMod=require('buffer');if(bufMod&&bufMod.Buffer){globalThis.Buffer=bufMod.Buffer;globalThis.global=globalThis;}}catch(e){}}if(typeof window!=='undefined'&&!window.Buffer&&typeof globalThis!=='undefined'&&globalThis.Buffer){window.Buffer=globalThis.Buffer;window.global=window;window.globalThis=window;}}catch(e){}})();\n`;
        
        if (lastImportLineIndex >= 0) {
          // Calculate the insert point after the last import line for the second setup
          let charIndex = 0;
          for (let i = 0; i <= lastImportLineIndex; i++) {
            charIndex += lines[i].length + 1; // +1 for the newline
          }
          
          // Buffer and BN are bundled with solana chunk
          // Set them globally after imports from the bundled modules
          // This ensures they're available for class definitions that come after
          const setupCode = `\n(function(){try{var B,BN;if(typeof Buffer!=='undefined'){B=Buffer;}if(typeof BN$1!=='undefined'){BN=BN$1;}else if(typeof BN!=='undefined'){BN=BN;}if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}if(BN){if(typeof globalThis!=='undefined'){globalThis.BN=BN;}if(typeof window!=='undefined'){window.BN=BN;}if(typeof global!=='undefined'){global.BN=BN;}}}catch(e){}})();`;
          
          // Also fix any direct access to safeBufferExports.Buffer to handle undefined case
          // Replace: var _Buffer = safeBufferExports.Buffer;
          // CRITICAL: _Buffer is assigned at module init, but Buffer might not be available yet
          // Solution: Make _Buffer a lazy getter that accesses Buffer when actually used
          // This ensures Buffer is available (from Buffer$1 or global) when methods are called
          // Note: fixedCode already contains the require$$2 fixes above
          // Fix direct access to safeBufferExports.Buffer - use simple fallback to global Buffer
          // Buffer should be available from the module scope (bundled) or global scope (set by setup code)
          let bufferFixedCode = fixedCode.replace(
            /var\s+_Buffer\s*=\s*safeBufferExports\.Buffer;/g,
            'var _Buffer = (typeof Buffer !== \'undefined\' ? Buffer : (typeof globalThis !== \'undefined\' && globalThis.Buffer ? globalThis.Buffer : (typeof window !== \'undefined\' && window.Buffer ? window.Buffer : (typeof safeBufferExports !== \'undefined\' && safeBufferExports && safeBufferExports.Buffer ? safeBufferExports.Buffer : void 0))));'
          );
          
          // Also need to replace all uses of _Buffer.method() with getBuffer().method()
          // Actually, better: make _Buffer an object with a getter, or use a function
          // Wait, the issue is that _Buffer is used like _Buffer.allocUnsafe(), so we need it to be the Buffer object
          // Let's try a different approach: use Object.defineProperty to create a lazy getter
          // Actually, simplest: replace with a function that returns Buffer, then wrap all _Buffer usages
          // But that's complex. Let's try making _Buffer a getter property instead
          
          // Better approach: Replace with immediate function that gets Buffer when called
          // But _Buffer needs to be the actual Buffer object, not a function
          // So we need to ensure Buffer is available. Let's try accessing Buffer$1 after module init
          // Actually, let's use a different pattern: create _Buffer as a property with getter
          
          // Simplest fix: Use Buffer$1 directly but wrap in try-catch and fallback
          // The key is that by the time _Buffer is USED (not assigned), Buffer$1 should be available
          // So we can use a function that gets called when _Buffer is accessed
          // But _Buffer is used as an object, not a function, so we need a Proxy or getter
          
          // Actually, the real issue: _Buffer is assigned once, but Buffer might not be ready
          // Solution: Make _Buffer a getter that accesses Buffer$1 when the property is accessed
          // Use Object.defineProperty or Proxy
          
          // Let me try a simpler approach: Just ensure Buffer$1 is used, but wrap it so it doesn't throw
          // We'll use a function that returns Buffer, and make _Buffer call that function
          // But _Buffer.allocUnsafe() won't work if _Buffer is a function
          
          // Best solution: Replace _Buffer with a Proxy that lazily gets Buffer when properties are accessed
          // Use cached Buffer to avoid repeated lookups and ensure Buffer is available
          bufferFixedCode = bufferFixedCode.replace(
            /var\s+_Buffer\s*=\s*\(function getBuffer\(\)\{var B;if\(typeof Buffer\$1!==\'undefined\'\)\{B=Buffer\$1;\}else if\(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports\.Buffer\)\{B=safeBufferExports\.Buffer;\}else if\(typeof Buffer!==\'undefined\'\)\{B=Buffer;\}else if\(typeof globalThis!==\'undefined\'&&globalThis\.Buffer\)\{B=globalThis\.Buffer;\}else if\(typeof window!==\'undefined\'&&window\.Buffer\)\{B=window\.Buffer;\}else if\(typeof global!==\'undefined\'&&global\.Buffer\)\{B=global\.Buffer;\}return B;\}\)\(\);/g,
            '(function(){var _cachedBuffer;function _getBuffer(){if(_cachedBuffer)return _cachedBuffer;if(typeof Buffer$1!==\'undefined\'){_cachedBuffer=Buffer$1;}else if(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports.Buffer){_cachedBuffer=safeBufferExports.Buffer;}else if(typeof Buffer!==\'undefined\'){_cachedBuffer=Buffer;}else if(typeof globalThis!==\'undefined\'&&globalThis.Buffer){_cachedBuffer=globalThis.Buffer;}else if(typeof window!==\'undefined\'&&window.Buffer){_cachedBuffer=window.Buffer;}else if(typeof global!==\'undefined\'&&global.Buffer){_cachedBuffer=global.Buffer;}if(!_cachedBuffer)throw new Error(\'Buffer is not available. Ensure solana-deps chunk loads first.\');return _cachedBuffer;}return new Proxy({},{get:function(t,p){var B=_getBuffer();return typeof B[p]===\'function\'?B[p].bind(B):B[p];}});})()'
          );
          
          // Also need to replace the IIFE pattern with actual _Buffer assignment
          // The IIFE should return the Proxy, and we assign it to _Buffer
          fixedCode = fixedCode.replace(
            /\(function\(\)\{var _cachedBuffer;function _getBuffer\(\)\{if\(_cachedBuffer\)return _cachedBuffer;if\(typeof Buffer\$1!==\'undefined\'\)\{_cachedBuffer=Buffer\$1;\}else if\(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports\.Buffer\)\{_cachedBuffer=safeBufferExports\.Buffer;\}else if\(typeof Buffer!==\'undefined\'\)\{_cachedBuffer=Buffer;\}else if\(typeof globalThis!==\'undefined\'&&globalThis\.Buffer\)\{_cachedBuffer=globalThis\.Buffer;\}else if\(typeof window!==\'undefined\'&&window\.Buffer\)\{_cachedBuffer=window\.Buffer;\}else if\(typeof global!==\'undefined\'&&global\.Buffer\)\{_cachedBuffer=global\.Buffer;\}if\(!_cachedBuffer\)throw new Error\(\'Buffer is not available\. Ensure solana-deps chunk loads first\.\'\);return _cachedBuffer;\}var _Buffer=new Proxy\(\{\},\{get:function\(t,p\)\{var B=_getBuffer\(\);return typeof B\[p\]===\'function\'\?B\[p\]\.bind\(B\):B\[p\];\}\}\);\}\)\(\);/g,
            'var _Buffer = (function(){var _cachedBuffer;function _getBuffer(){if(_cachedBuffer)return _cachedBuffer;if(typeof Buffer$1!==\'undefined\'){_cachedBuffer=Buffer$1;}else if(typeof safeBufferExports!==\'undefined\'&&safeBufferExports&&safeBufferExports.Buffer){_cachedBuffer=safeBufferExports.Buffer;}else if(typeof Buffer!==\'undefined\'){_cachedBuffer=Buffer;}else if(typeof globalThis!==\'undefined\'&&globalThis.Buffer){_cachedBuffer=globalThis.Buffer;}else if(typeof window!==\'undefined\'&&window.Buffer){_cachedBuffer=window.Buffer;}else if(typeof global!==\'undefined\'&&global.Buffer){_cachedBuffer=global.Buffer;}if(!_cachedBuffer)throw new Error(\'Buffer is not available. Ensure solana-deps chunk loads first.\');return _cachedBuffer;}return new Proxy({},{get:function(t,p){var B=_getBuffer();return typeof B[p]===\'function\'?B[p].bind(B):B[p];}});})();'
          );
          
          return setupCodeBefore + bufferFixedCode.slice(0, charIndex) + setupCode + bufferFixedCode.slice(charIndex);
        } else {
          // No imports found, inject at beginning
          const setupCode = `(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
          return setupCodeBefore + setupCode + fixedCode;
        }
      }
      
      // No solana-deps chunk anymore - Buffer is bundled with solana
      
      // Handle solana-spl chunk
      if (chunk.name === 'solana-spl') {
        const importRegex = /import\s+.*?\s+from\s+['"].*?['"];?/g;
        let lastImportEnd = 0;
        let match;
        while ((match = importRegex.exec(code)) !== null) {
          lastImportEnd = Math.max(lastImportEnd, match.index + match[0].length);
        }
        if (lastImportEnd > 0) {
          const newlineAfterImport = code.indexOf('\n', lastImportEnd);
          const insertPoint = newlineAfterImport !== -1 ? newlineAfterImport + 1 : lastImportEnd;
          const setupCode = `\n(function(){try{const B=typeof Buffer!=='undefined'?Buffer:void 0;if(B){if(typeof globalThis!=='undefined'){globalThis.Buffer=B;globalThis.global=globalThis;}if(typeof window!=='undefined'){window.Buffer=B;window.global=window;window.globalThis=window;}if(typeof global!=='undefined'){global.Buffer=B;}}}catch(e){}})();`;
          return code.slice(0, insertPoint) + setupCode + code.slice(insertPoint);
        }
      }
      
      // Handle viem chunk - fix TDZ errors for imports from solana chunk
      if (chunk.name === 'viem') {
        // Fix TDZ errors for all error classes and utilities imported from solana
        // The issue is that these are being assigned in object literals before imports are resolved
        // Make assignments lazy by using getter functions
        let fixedCode = code;
        
        // Helper function to create lazy getter (as string for replacement)
        const createLazyGetterStr = (varName: string) => {
          return `(function(){var _cache;return function(){if(!_cache){if(typeof ${varName}==='undefined'){throw new Error('Cannot access ${varName}: not initialized');}_cache=${varName};}return _cache;};})()`;
        };
        
        // Fix all error classes with $ suffix (e.g., IntegerOutOfRangeError$1, InvalidBytesBooleanError$1, SizeOverflowError$2)
        // Pattern: Key: ErrorName$N
        fixedCode = fixedCode.replace(
          /(\w+):\s*(\w+Error)\$(\d+)(,|\s*})/g,
          (match, key, errorName, suffixNum, suffix) => {
            const varName = `${errorName}$${suffixNum}`;
            return `${key}: ${createLazyGetterStr(varName)}${suffix}`;
          }
        );
        
        // Fix error classes without $ suffix (e.g., InvalidHexBooleanError)
        // Pattern: Key: ErrorName (but not ErrorName$N)
        const errorClasses = [
          'InvalidHexBooleanError',
          'IntegerOutOfRangeError',
          'InvalidBytesBooleanError',
          'SizeOverflowError',
        ];
        
        for (const errorClass of errorClasses) {
          // Fix in object literals with key: value syntax - make sure we don't match ErrorName$N
          // Don't match in import statements (they have 'as' or 'from')
          fixedCode = fixedCode.replace(
            new RegExp(`(\\w+):\\s*${errorClass}(?!\\$)(,|\\s*})`, 'g'),
            (match, key, suffix, offset, str) => {
              // Check if this is inside an import statement
              const beforeMatch = str.substring(Math.max(0, offset - 100), offset);
              if (beforeMatch.includes('import ') && (beforeMatch.includes(' as ') || beforeMatch.includes(' from '))) {
                return match; // Don't replace in import statements
              }
              return `${key}: ${createLazyGetterStr(errorClass)}${suffix}`;
            }
          );
          
          // Fix shorthand property syntax: InvalidHexBooleanError, (key and value are the same)
          // Only match in object literals, not in import statements
          // Pattern: must be after a comma or opening brace, and not after " as "
          fixedCode = fixedCode.replace(
            new RegExp(`([,{}\\s])${errorClass}(?!\\$)(,|\\s*})`, 'g'),
            (match, prefix, suffix, offset, str) => {
              // Check if this is inside an import statement - look for " as " before the match
              const beforeMatch = str.substring(Math.max(0, offset - 200), offset + match.length);
              // If we see " as " followed by the error class, it's an import - don't replace
              if (beforeMatch.includes(' as ') && beforeMatch.indexOf(' as ') < beforeMatch.indexOf(errorClass)) {
                return match; // Don't replace in import statements
              }
              // Also check if we're in an import statement by looking for "import" and "from"
              if (beforeMatch.includes('import ') && beforeMatch.includes(' from ')) {
                return match; // Don't replace in import statements
              }
              // Convert shorthand to explicit key: value with lazy getter
              return `${prefix}${errorClass}: ${createLazyGetterStr(errorClass)}${suffix}`;
            }
          );
          
          // Fix direct uses: throw new ErrorClass(...)
          fixedCode = fixedCode.replace(
            new RegExp(`throw new ${errorClass}(?!\\$)\\(`, 'g'),
            `throw new ${createLazyGetterStr(errorClass)}()(`
          );
        }
        
        // Also fix any remaining direct uses of error classes with $ suffix
        fixedCode = fixedCode.replace(
          /throw new (\w+Error)\$(\d+)\(/g,
          (match, errorName, suffixNum) => {
            const varName = `${errorName}$${suffixNum}`;
            return `throw new ${createLazyGetterStr(varName)}()(`;
          }
        );
        
        return fixedCode;
      }
      
      // Handle vendor chunk - fix TDZ errors for imports from react chunk
      if (chunk.name === 'vendor') {
        // Fix TDZ errors for y$2 and other variables imported from react
        // The issue is that these are being used in class extends before imports are resolved
        // Wrap class extends in IIFE to make it lazy
        let fixedCode = code;
        
        // Process line by line to handle multiline class definitions
        const lines = fixedCode.split('\n');
        const newLines: string[] = [];
        let inIIFE = false;
        let braceDepth = 0;
        let iifeStart = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if this line starts a class extends y$N pattern
          // Variable names can have $ in them (e.g., i$4), so use [\w$]+ instead of \w+
          const classExtendsMatch = line.match(/^(\s*)(let|const|var)\s+([\w$]+)\s+=\s*class\s+(\w+)\s+extends\s+(\w+\$\d+)\s*{/);
          
          if (classExtendsMatch && !inIIFE) {
            const [, indent, keyword, varName, className, extendsVar] = classExtendsMatch;
            inIIFE = true;
            braceDepth = 1;
            // Store varName and extendsVar for use when closing the IIFE
            let storedVarName = varName;
            let storedExtendsVar = extendsVar;
            let storedClassName = className;
            // Use a factory function that creates the class when y$2 is available
            // Store the class definition in a variable and assign it later
            // This delays the class creation until y$2 is initialized
            const factoryVarName = `_create${varName}`;
            iifeStart = `${indent}${keyword} ${varName};var ${factoryVarName}=function(){if(typeof ${extendsVar}==='undefined'){throw new Error('Cannot access ${extendsVar}: not initialized. Ensure react chunk (01-react) loads before vendor chunk.');}return class ${className} extends ${extendsVar} {`;
            newLines.push(iifeStart);
            // Store these for later use
            (newLines as any).__storedVarName = storedVarName;
            (newLines as any).__storedExtendsVar = storedExtendsVar;
            (newLines as any).__storedClassName = storedClassName;
            (newLines as any).__factoryVarName = factoryVarName;
            // Mark this variable as initialized (not pending) so the pending variable wrapper doesn't interfere
            (newLines as any).__initializedVars = (newLines as any).__initializedVars || new Set();
            (newLines as any).__initializedVars.add(storedVarName);
            continue;
          }
          
          // Check if we need to wrap code that uses a pending variable
          const pendingVarName = (newLines as any).__pendingVarName;
          const initializedVars = (newLines as any).__initializedVars || new Set();
          // Skip pending variable wrapping if this variable is already initialized
          if (pendingVarName && !inIIFE && !initializedVars.has(pendingVarName)) {
            const pendingStart = (newLines as any).__pendingVarNameStart || 0;
            const pendingLineCount = ((newLines as any).__pendingVarNameLineCount || 0) + 1;
            (newLines as any).__pendingVarNameLineCount = pendingLineCount;
            
            // Look for lines that use the pending variable (within first 10 lines after)
            if (pendingLineCount <= 10) {
              const varUsageRegex = new RegExp(`\\b${pendingVarName.replace(/\$/g, '\\$')}(\\.[\\w$]+|\\[|\\s*[=,;:])`);
              if (varUsageRegex.test(line)) {
                // Wrap this line in a function that waits for the variable
                const indent = line.match(/^(\s*)/)?.[1] || '';
                // Check if we're starting a new wrapper or continuing an existing one
                const isStartingWrapper = !(newLines as any).__pendingVarNameInWrapper;
                if (isStartingWrapper) {
                  // Start a new wrapper function
                  newLines.push(`(function(){function _wait${pendingVarName.replace(/\$/g, '_')}(){if(!${pendingVarName}){queueMicrotask(_wait${pendingVarName.replace(/\$/g, '_')});return;}`);
                  (newLines as any).__pendingVarNameInWrapper = true;
                }
                // Add the line inside the wrapper
                newLines.push(line);
                // Check if the next line uses the variable (look ahead up to 5 lines)
                let nextLineUsesVar = false;
                for (let j = 1; j <= 5 && i + j < lines.length; j++) {
                  const nextLine = lines[i + j];
                  if (nextLine && varUsageRegex.test(nextLine)) {
                    nextLineUsesVar = true;
                    break;
                  }
                  // If we hit an empty line or comment, stop looking
                  if (nextLine && (nextLine.trim() === '' || nextLine.trim().startsWith('//') || nextLine.trim().startsWith('/*'))) {
                    break;
                  }
                }
                if (!nextLineUsesVar) {
                  // Close the wrapper function - no more lines use the variable
                  newLines.push(`}_wait${pendingVarName.replace(/\$/g, '_')}();})();`);
                  (newLines as any).__pendingVarNameInWrapper = false;
                }
                continue;
              }
            } else {
              // Clear pending flag after 10 lines
              // Also close any open wrapper
              if ((newLines as any).__pendingVarNameInWrapper) {
                const pendingVarName = (newLines as any).__pendingVarName;
                newLines.push(`}_wait${pendingVarName.replace(/\$/g, '_')}();})();`);
                (newLines as any).__pendingVarNameInWrapper = false;
              }
              delete (newLines as any).__pendingVarName;
              delete (newLines as any).__pendingVarNameStart;
              delete (newLines as any).__pendingVarNameLineCount;
              delete (newLines as any).__pendingVarNameInWrapper;
            }
          }
          
          if (inIIFE) {
            // Count braces to find when class ends
            for (const char of line) {
              if (char === '{') braceDepth++;
              if (char === '}') braceDepth--;
            }
            
            newLines.push(line);
            
            // Check if we're waiting for a variable and this line uses it
            const waitingForVar = (newLines as any).__waitingForVar;
            if (waitingForVar && new RegExp(`\\b${waitingForVar.replace(/\$/g, '\\$')}(\\.[\\w$]+|\\[|\\s*[=,;:\\)\\}])`).test(line)) {
              (newLines as any).__waitingVarLines = ((newLines as any).__waitingVarLines || 0) + 1;
            }
            
            // Check if we should close the waiting wrapper
            const waitingVarLines = (newLines as any).__waitingVarLines || 0;
            const closeAfter = (newLines as any).__waitingVarCloseAfter || 0;
            if (waitingForVar && (waitingVarLines >= closeAfter || (line.trim() === '' || line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')))) {
              if (waitingVarLines > 0) {
                newLines.push(`}_waitFor${waitingForVar.replace(/\$/g, '_')}();})();`);
                delete (newLines as any).__waitingForVar;
                delete (newLines as any).__waitingVarStart;
                delete (newLines as any).__waitingVarLines;
                delete (newLines as any).__waitingVarCloseAfter;
              }
            }
            
            if (braceDepth === 0) {
              // Class ended, close the factory function and assign to variable
              const lastLine = newLines[newLines.length - 1];
              const storedVarName = (newLines as any).__storedVarName;
              const factoryVarName = (newLines as any).__factoryVarName;
              // Close factory function and assign variable immediately
              // Use try-catch with setTimeout fallback to handle TDZ errors
              if (lastLine.trim().endsWith('}')) {
                newLines[newLines.length - 1] = lastLine.replace(/\}\s*$/, `};};try{${storedVarName}=${factoryVarName}();}catch(e){setTimeout(function(){try{${storedVarName}=${factoryVarName}();}catch(e2){console.error('Failed to create ${storedVarName}:',e2);}},0);}`);
              } else {
                newLines.push(`};try{${storedVarName}=${factoryVarName}();}catch(e){setTimeout(function(){try{${storedVarName}=${factoryVarName}();}catch(e2){console.error('Failed to create ${storedVarName}:',e2);}},0);}`);
              }
              
              // Mark variable as initialized to prevent pending variable wrapper
              const initializedVars = (newLines as any).__initializedVars || new Set();
              initializedVars.add(storedVarName);
              (newLines as any).__initializedVars = initializedVars;
              
              // Don't wrap subsequent lines - variable is initialized
              // Remove any pending variable tracking for this variable
              if ((newLines as any).__pendingVarName === storedVarName) {
                delete (newLines as any).__pendingVarName;
                delete (newLines as any).__pendingVarNameStart;
                delete (newLines as any).__pendingVarNameLineCount;
                delete (newLines as any).__pendingVarNameInWrapper;
              }
              
              // Wrap subsequent lines that use this variable to wait for initialization
              // Since the factory might fail initially, we need to wait for the variable
              let lookAhead = 0;
              let wrappedNext = false;
              let linesToWrap = 0;
              while (lookAhead < 15 && i + lookAhead + 1 < lines.length) {
                const nextLine = lines[i + lookAhead + 1];
                // Check if this line uses the variable
                if (nextLine && new RegExp(`\\b${storedVarName.replace(/\$/g, '\\$')}(\\.[\\w$]+|\\[|\\s*[=,;:\\)\\}])`).test(nextLine)) {
                  linesToWrap++;
                  // Found a line that uses the variable - wrap it
                  if (!wrappedNext) {
                    // Start wrapper function that waits for variable to be initialized
                    newLines.push(`(function(){function _waitFor${storedVarName.replace(/\$/g, '_')}(){if(!${storedVarName}){setTimeout(_waitFor${storedVarName.replace(/\$/g, '_')},0);return;}`);
                    wrappedNext = true;
                    (newLines as any).__waitingForVar = storedVarName;
                    (newLines as any).__waitingVarStart = newLines.length;
                    (newLines as any).__waitingVarLines = 0;
                  }
                }
                // Stop if we hit an empty line or comment (likely end of related code block)
                // But only if we've found at least one line to wrap
                if (nextLine && linesToWrap > 0 && (nextLine.trim() === '' || nextLine.trim().startsWith('//') || nextLine.trim().startsWith('/*') || nextLine.trim().startsWith('*'))) {
                  if (wrappedNext && linesToWrap > 0) {
                    // Close the wrapper before the empty line/comment
                    (newLines as any).__waitingVarCloseAfter = linesToWrap;
                  }
                  break;
                }
                lookAhead++;
              }
              // If we found lines to wrap but didn't hit an empty line, close after all wrapped lines
              if (wrappedNext && linesToWrap > 0 && !(newLines as any).__waitingVarCloseAfter) {
                (newLines as any).__waitingVarCloseAfter = linesToWrap;
              }
              inIIFE = false;
              braceDepth = 0;
              // Clean up stored values
              delete (newLines as any).__storedVarName;
              delete (newLines as any).__storedExtendsVar;
              delete (newLines as any).__storedClassName;
              delete (newLines as any).__factoryVarName;
            }
            continue;
          }
          
          // Check if we're waiting for a variable and this line uses it (outside IIFE)
          const waitingForVar = (newLines as any).__waitingForVar;
          if (waitingForVar && new RegExp(`\\b${waitingForVar.replace(/\$/g, '\\$')}(\\.[\\w$]+|\\[|\\s*[=,;:\\)\\}])`).test(line)) {
            (newLines as any).__waitingVarLines = ((newLines as any).__waitingVarLines || 0) + 1;
            // Add the line inside the wrapper
            newLines.push(line);
            // Check if we should close the wrapper after this line
            const waitingVarLines = (newLines as any).__waitingVarLines || 0;
            const closeAfter = (newLines as any).__waitingVarCloseAfter || 0;
            // Don't close if next line also uses the variable
            let nextLineUsesVar = false;
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              if (nextLine && new RegExp(`\\b${waitingForVar.replace(/\$/g, '\\$')}(\\.[\\w$]+|\\[|\\s*[=,;:\\)\\}])`).test(nextLine)) {
                nextLineUsesVar = true;
              }
            }
            // Close if we've wrapped all expected lines AND next line doesn't use the variable
            // Also check that the current line is a complete statement (ends with ;, }, ], or ))
            const lineTrimmed = line.trim();
            // Don't close if current line ends with ] and next line completes with ];
            const currentLineEndsWithBracket = (lineTrimmed.endsWith(']') && !lineTrimmed.endsWith('];')) || (lineTrimmed.endsWith('})') && !lineTrimmed.endsWith('});'));
            // Check if next line (or lines) complete the statement
            let nextLineCompletes = false;
            if (i + 1 < lines.length) {
              const nextLineTrimmed = lines[i + 1].trim();
              // Check for exact matches or patterns that complete the statement
              nextLineCompletes = nextLineTrimmed === '];' || nextLineTrimmed === ']);' || 
                                  nextLineTrimmed.startsWith('];') || nextLineTrimmed.startsWith('});') ||
                                  nextLineTrimmed.endsWith('];') || nextLineTrimmed.endsWith('});');
            }
            // Also check if statement completion is within next 2 lines
            if (!nextLineCompletes && i + 2 < lines.length) {
              const nextNextLineTrimmed = lines[i + 2].trim();
              if (nextNextLineTrimmed === '];' || nextNextLineTrimmed === ']);' || 
                  nextNextLineTrimmed.startsWith('];') || nextNextLineTrimmed.startsWith('});')) {
                nextLineCompletes = true;
              }
            }
            // CRITICAL: If current line ends with ], ALWAYS delay closing until we see statement completion
            // This prevents closing wrapper in the middle of multi-line statements like new Map([...]);
            if (currentLineEndsWithBracket) {
              // Check if any of the next few lines will complete the statement
              let willCompleteSoon = false;
              for (let j = 1; j <= 5 && i + j < lines.length; j++) {
                const checkLine = lines[i + j].trim();
                // Check for statement completion patterns - be very permissive
                if (checkLine.includes('];') || checkLine.includes('});') || 
                    checkLine === '];' || checkLine === ']);' || 
                    checkLine.startsWith('];') || checkLine.startsWith('});') ||
                    checkLine.endsWith('];') || checkLine.endsWith('});')) {
                  willCompleteSoon = true;
                  break;
                }
                // Stop if we hit something that's clearly a new statement (not part of array/object)
                // But allow template strings, array elements, comments, etc.
                if (checkLine && 
                    !checkLine.startsWith(']') && !checkLine.startsWith('}') && 
                    !checkLine.startsWith('//') && !checkLine.startsWith('/*') && 
                    !checkLine.startsWith('*') && !checkLine.startsWith('tt`') && 
                    !checkLine.startsWith('[') && !checkLine.match(/^\s*["'`]/) && 
                    checkLine !== '' && !checkLine.match(/^\s*\d/) &&
                    !checkLine.match(/^\s*[a-zA-Z_$]/)) {
                  // This looks like a new statement, stop looking
                  break;
                }
              }
              // If we found completion coming soon OR if next line completes, don't close yet
              if (willCompleteSoon || nextLineCompletes) {
                // Don't close wrapper yet - wait for statement completion line to be processed
                continue; // Skip rest of loop iteration, don't process closing logic
              }
            }
            // Don't close if line ends with opening bracket/paren (incomplete statement)
            const isIncompleteStatement = lineTrimmed.endsWith('[') || lineTrimmed.endsWith('(') || lineTrimmed.endsWith('{');
            // Check if next few lines complete the statement (look ahead up to 5 lines)
            let nextLinesCompleteStatement = false;
            let foundClosingBracket = false;
            for (let j = 1; j <= 5 && i + j < lines.length; j++) {
              const nextLineTrimmed = lines[i + j].trim();
              // Check for statement completion patterns
              if (nextLineTrimmed.startsWith('];') || nextLineTrimmed.startsWith('});') || nextLineTrimmed === '];' || nextLineTrimmed === '});') {
                nextLinesCompleteStatement = true;
                foundClosingBracket = true;
                break;
              }
              // Check for closing brackets that might be followed by semicolon
              if (nextLineTrimmed === ']' || nextLineTrimmed === '})') {
                foundClosingBracket = true;
                // Check if next line has semicolon (completing the statement)
                if (i + j + 1 < lines.length) {
                  const nextNextLineTrimmed = lines[i + j + 1].trim();
                  if (nextNextLineTrimmed === ';' || nextNextLineTrimmed.startsWith(';') || nextNextLineTrimmed === '];' || nextNextLineTrimmed.startsWith('];') || nextNextLineTrimmed === '});' || nextNextLineTrimmed.startsWith('});')) {
                    nextLinesCompleteStatement = true;
                    break;
                  }
                }
                // Also check if current line itself ends with ]; or });
                if (nextLineTrimmed.endsWith('];') || nextLineTrimmed.endsWith('});')) {
                  nextLinesCompleteStatement = true;
                  break;
                }
              }
              // Stop if we hit a line that uses the variable or starts a new statement (not part of array/object)
              if (nextLineTrimmed && !nextLineTrimmed.startsWith(']') && !nextLineTrimmed.startsWith('}') && !nextLineTrimmed.startsWith('//') && !nextLineTrimmed.startsWith('/*') && !nextLineTrimmed.startsWith('*') && !nextLineTrimmed.startsWith('tt`') && !nextLineTrimmed.startsWith('[') && nextLineTrimmed !== '') {
                // If we haven't found a closing bracket yet, this might be a new statement
                if (!foundClosingBracket) {
                  break;
                }
              }
            }
            // A statement is complete if it ends with ; or if next lines complete it
            // But don't close if current line ends with ] and next line will complete it with ];
            // Also add safety check: never close if line ends with ] (incomplete statement)
            const stillHasIncompleteBracket = (lineTrimmed.endsWith(']') && !lineTrimmed.endsWith('];')) || (lineTrimmed.endsWith('})') && !lineTrimmed.endsWith('});'));
            const isCompleteStatement = (lineTrimmed.endsWith(';') || lineTrimmed.endsWith('});') || lineTrimmed.endsWith(']);') || nextLinesCompleteStatement || (lineTrimmed.endsWith('}') && !lineTrimmed.includes('function')) || lineTrimmed === '' || lineTrimmed.startsWith('//') || lineTrimmed.startsWith('/*') || lineTrimmed.startsWith('*')) && !(currentLineEndsWithBracket && nextLineCompletes) && !stillHasIncompleteBracket;
            if (!nextLineUsesVar && !isIncompleteStatement && isCompleteStatement && (waitingVarLines >= closeAfter || (lineTrimmed === '' || lineTrimmed.startsWith('//') || lineTrimmed.startsWith('/*') || lineTrimmed.startsWith('*')))) {
              newLines.push(`}_waitFor${waitingForVar.replace(/\$/g, '_')}();})();`);
              delete (newLines as any).__waitingForVar;
              delete (newLines as any).__waitingVarStart;
              delete (newLines as any).__waitingVarLines;
              delete (newLines as any).__waitingVarCloseAfter;
            }
            continue;
          }
          
          // Check if we should close the waiting wrapper (outside IIFE) - for non-matching lines
          const waitingVarLines = (newLines as any).__waitingVarLines || 0;
          const closeAfter = (newLines as any).__waitingVarCloseAfter || 0;
          const lineTrimmed = line.trim();
          // Don't close if line ends with opening bracket/paren (incomplete statement)
          const isIncompleteStatement = lineTrimmed.endsWith('[') || lineTrimmed.endsWith('(') || lineTrimmed.endsWith('{');
          // Check if next few lines complete the statement (look ahead up to 5 lines)
          let nextLinesCompleteStatement = false;
          let foundClosingBracket = false;
          for (let j = 1; j <= 5 && i + j < lines.length; j++) {
            const nextLineTrimmed = lines[i + j].trim();
            // Check for statement completion patterns
            if (nextLineTrimmed.startsWith('];') || nextLineTrimmed.startsWith('});') || nextLineTrimmed === '];' || nextLineTrimmed === '});') {
              nextLinesCompleteStatement = true;
              foundClosingBracket = true;
              break;
            }
            // Check for closing brackets that might be followed by semicolon
            if (nextLineTrimmed === ']' || nextLineTrimmed === '})') {
              foundClosingBracket = true;
              // Check if next line has semicolon
              if (i + j + 1 < lines.length) {
                const nextNextLineTrimmed = lines[i + j + 1].trim();
                if (nextNextLineTrimmed.startsWith(';') || nextNextLineTrimmed.startsWith('];') || nextNextLineTrimmed.startsWith('});')) {
                  nextLinesCompleteStatement = true;
                  break;
                }
              }
            }
            // Stop if we hit a line that uses the variable or starts a new statement (not part of array/object)
            if (nextLineTrimmed && !nextLineTrimmed.startsWith(']') && !nextLineTrimmed.startsWith('}') && !nextLineTrimmed.startsWith('//') && !nextLineTrimmed.startsWith('/*') && !nextLineTrimmed.startsWith('*') && !nextLineTrimmed.startsWith('tt`') && !nextLineTrimmed.startsWith('[') && nextLineTrimmed !== '') {
              // If we haven't found a closing bracket yet, this might be a new statement
              if (!foundClosingBracket) {
                break;
              }
            }
          }
          // A statement is complete if it ends with ; or if next lines complete it
          const isCompleteStatement = lineTrimmed.endsWith(';') || lineTrimmed.endsWith('});') || lineTrimmed.endsWith(']);') || nextLinesCompleteStatement || (lineTrimmed.endsWith('}') && !lineTrimmed.includes('function')) || lineTrimmed === '' || lineTrimmed.startsWith('//') || lineTrimmed.startsWith('/*') || lineTrimmed.startsWith('*');
          if (waitingForVar && waitingVarLines > 0 && !isIncompleteStatement && isCompleteStatement && (waitingVarLines >= closeAfter || (lineTrimmed === '' || lineTrimmed.startsWith('//') || lineTrimmed.startsWith('/*') || lineTrimmed.startsWith('*')))) {
            newLines.push(`}_waitFor${waitingForVar.replace(/\$/g, '_')}();})();`);
            delete (newLines as any).__waitingForVar;
            delete (newLines as any).__waitingVarStart;
            delete (newLines as any).__waitingVarLines;
            delete (newLines as any).__waitingVarCloseAfter;
          }
          
          newLines.push(line);
        }
        
        return newLines.join('\n');
      }
      
      return null; // No changes for other chunks
    },
  };
};



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    suppressSourcemapWarnings(),
    setupBufferGlobals(),
    react({
      // Enable Fast Refresh
      fastRefresh: true,
    }),
    nodePolyfills({
      // Enable polyfills for Node.js modules
      include: ['assert', 'buffer', 'process', 'crypto'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Ensure Buffer is available before other modules load
      protocolImports: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'favicon-96x96.png',
        'apple-touch-icon.png',
        'og-image.png',
        'logo.svg',
        'site.webmanifest',
      ],
      manifest: {
        name: 'TokenClub - Solana Token Platform',
        short_name: 'TokenClub',
        description: 'Create, swap, and manage Solana tokens instantly',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0A0C0E',
        theme_color: '#0A0C0E',
        orientation: 'portrait-primary',
        categories: ['finance', 'business', 'utilities'],
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Increase file size limit to handle large vendor bundles
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        // Exclude large files from precaching (they'll be cached on demand)
        globIgnores: [
          '**/favicon.svg',
          '**/*.map',
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'global': 'globalThis',
    'process.env': {},
    'process.browser': true,
  },
  build: {
    target: 'esnext',
    // Disable minification entirely to prevent bs58/buffer errors
    // Server-side compression (gzip/brotli) will still reduce file sizes
    minify: false,
    cssMinify: true,
    // Ensure proper module format
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        // Filter out any data URIs or invalid modulepreload entries
        return deps.filter(dep => !dep.startsWith('data:'));
      },
    },
    // Enable source maps for debugging (disable in production for smaller bundles)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Ensure proper format for ES modules
        format: 'es',
        // Hoist transitive imports to prevent circular dependency issues
        hoistTransitiveImports: false,  // Disable to prevent TDZ errors
        // Use external live bindings to handle circular dependencies properly
        // This allows circular dependencies to work by using live bindings
        externalLiveBindings: true,  // Enable to handle circular deps within solana chunk
        // Ensure proper chunk ordering - solana-deps must load before solana-core
        // This prevents "Class extends value undefined" errors
        chunkFileNames: (chunkInfo) => {
          // Ensure proper chunk load order to prevent TDZ errors
          // 1. solana loads first (viem imports from it)
          // 2. react loads before vendor (vendor imports from react)
          // 3. viem loads after solana
          if (chunkInfo.name === 'solana') {
            return 'assets/js/00-solana-[hash].js';
          }
          if (chunkInfo.name === 'react') {
            return 'assets/js/01-react-[hash].js';
          }
          if (chunkInfo.name === 'solana-deps') {
            return 'assets/js/00-solana-deps-[hash].js';
          }
          if (chunkInfo.name === 'react') {
            return 'assets/js/01-react-[hash].js';
          }
          return 'assets/js/[name]-[hash].js';
        },
        // Experimental: Set minimum chunk size to encourage more splitting
        experimentalMinChunkSize: 20000, // 20KB minimum to prevent huge chunks
        manualChunks: (id) => {
          // Split node_modules into separate chunks to avoid circular dependencies
          if (id.includes('node_modules')) {
            // CRITICAL: Bundle ALL Solana dependencies together FIRST to prevent circular deps
            // This includes encoding packages (bs58, base-x) that might be in vendor otherwise
            // Check for encoding/bs58/base-x FIRST before other checks
            if (
              id.includes('bs58') || 
              id.includes('base-x') || 
              id.includes('/encoding') ||
              id.includes('@solana/web3.js') || 
              id.includes('bn.js') || 
              (id.includes('buffer') && !id.includes('bs58') && !id.includes('base-x')) || 
              id.includes('rpc-websockets') || 
              id.includes('eventemitter3') || 
              id.includes('events') || 
              id.includes('superstruct') || 
              id.includes('borsh')
            ) {
              return 'solana'; // Bundle together - MUST be first check
            }
            // @solana/spl-token - separate chunk
            if (id.includes('@solana/spl-token')) {
              return 'solana-spl';
            }
            // No other @solana/ packages are used, so don't create a separate chunk
            // This prevents circular dependency issues
            // Crypto-related packages - keep separate to avoid minification issues
            if (id.includes('crypto') || id.includes('@noble/')) {
              return 'crypto';
            }
            // Metaplex packages
            if (id.includes('@metaplex-foundation/')) {
              return 'metaplex';
            }
            // Meteora packages
            if (id.includes('@meteora-ag/')) {
              return 'meteora';
            }
            // Reown/AppKit packages - split further to reduce chunk size
            if (id.includes('@reown/appkit')) {
              return 'reown-core';
            }
            if (id.includes('@reown/appkit-adapter')) {
              return 'reown-adapter';
            }
            if (id.includes('@reown/') || id.includes('@walletconnect/')) {
              return 'reown';
            }
            // React packages
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Framer Motion - separate chunk
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // Viem and related packages - separate chunk (used by Reown)
            if (id.includes('viem') || id.includes('@wagmi/')) {
              return 'viem';
            }
            // Split other vendor packages into smaller chunks
            // Large utility libraries
            if (id.includes('lodash') || id.includes('ramda')) {
              return 'utils';
            }
            // Other vendor packages
            return 'vendor';
          }
          // Split modules into separate chunks
          if (id.includes('/modules/')) {
            return 'modules';
          }
        },
        // Optimize chunk file names
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        // Suppress sourcemap warnings for Metaplex package
        if (warning.code === 'SOURCEMAP_ERROR' && warning.id?.includes('@metaplex-foundation/mpl-token-metadata')) {
          return;
        }
        // Suppress circular dependency warnings for crypto-related packages
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('crypto')) {
          return;
        }
        // Suppress circular dependency warnings for encoding packages
        if (warning.code === 'CIRCULAR_DEPENDENCY' && (warning.message?.includes('bs58') || warning.message?.includes('buffer'))) {
          return;
        }
        // Suppress circular dependency warnings for Solana packages (they have internal circular deps)
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('@solana/')) {
          return;
        }
        // Suppress circular dependency warnings for BN
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('bn.js')) {
          return;
        }
        warn(warning);
      },
      // Use exports mode to prevent circular dependency issues
      preserveEntrySignatures: 'exports-only',
    },
    chunkSizeWarningLimit: 500, // Lower limit to encourage better chunking
    // Enable compression
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: [
      'vite-plugin-node-polyfills',
      'vite-plugin-node-polyfills/shims',
    ],
    // Pre-bundle dependencies for faster dev server
    esbuildOptions: {
      target: 'esnext',
      // Transform CommonJS modules
      format: 'esm',
    },
  },
  server: {
    port: 3000,
    open: true,
    // Enable HMR for faster development
    hmr: {
      overlay: true,
    },
  },
  // Suppress sourcemap warnings for packages with missing source files
  logLevel: 'warn',
  // Enable CSS code splitting
  css: {
    devSourcemap: false,
  },
})

