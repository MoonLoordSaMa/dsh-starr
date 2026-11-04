import fs from "node:fs";
import ts from "typescript";
import { format } from "prettier";

// 前后端共用同一份算法；安装包中的后端仅加载JavaScript。
const input = new URL("../src/starrcore/organism.ts", import.meta.url);
const output = new URL("../src/starrcore/organism.mjs", import.meta.url);
const result = ts.transpileModule(fs.readFileSync(input, "utf8"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  reportDiagnostics: true,
});
if (result.diagnostics?.some((d) => d.category === ts.DiagnosticCategory.Error))
  throw new Error("角色状态运行模块生成失败");
const code = await format(
  "// 由scripts/build-runtime.mjs生成，请修改organism.ts后重新构建。\n" +
    result.outputText,
  { parser: "babel" },
);
if (process.argv.includes("--check")) {
  if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== code)
    throw new Error(
      "角色状态运行模块未同步，请先运行node scripts/build-runtime.mjs",
    );
} else fs.writeFileSync(output, code);
