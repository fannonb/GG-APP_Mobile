const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const ts = require('typescript')

// Test the real TypeScript modules without adding a runtime/test dependency.
module.exports = function loadTs(relative, stubs = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const localRequire = createRequire(filename)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(
    name => Object.hasOwn(stubs, name) ? stubs[name] : localRequire(name), module, module.exports,
  )
  return module.exports
}
