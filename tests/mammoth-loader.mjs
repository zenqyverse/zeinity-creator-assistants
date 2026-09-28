export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'mammoth') {
    return nextResolve('mammoth/mammoth.browser.js', context);
  }
  if (specifier === '@/hooks/useSettings') {
    return nextResolve(new URL('../src/hooks/useSettings.ts', import.meta.url).href, context);
  }
  if (specifier.startsWith('@/')) {
    const subpath = specifier.slice(2);
    return nextResolve(new URL(`../src/${subpath}.ts`, import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (typeof result.source === 'string' || Buffer.isBuffer(result.source)) {
    let source = result.source.toString();
    if (source.includes('import.meta.env')) {
      // Polyfill Vite's import.meta.env in Node test runtime
      source = `if (typeof import.meta.env === 'undefined') { Object.defineProperty(import.meta, 'env', { value: globalThis.__vite_env || {} }); }\n` + source;
      return {
        ...result,
        source,
      };
    }
  }
  return result;
}
