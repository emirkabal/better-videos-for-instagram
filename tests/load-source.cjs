const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const { createRequire } = require("node:module")
const ts = require("typescript")

// Run the actual TypeScript source with small browser stubs, without a test bundler.
module.exports = function loadSource(relativePath, globals = {}) {
  const filename = path.resolve(__dirname, "..", relativePath)
  const nativeRequire = createRequire(filename)
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText
  const exports = {}
  vm.runInNewContext(
    source,
    {
      exports,
      ...globals,
      require(specifier) {
        const sibling = path.resolve(path.dirname(filename), `${specifier}.ts`)
        if (specifier.startsWith(".") && fs.existsSync(sibling)) {
          return loadSource(
            path.relative(path.resolve(__dirname, ".."), sibling),
            globals
          )
        }
        return nativeRequire(specifier)
      }
    },
    { filename }
  )
  return exports
}
