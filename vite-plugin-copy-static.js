// vite-plugin-copy-static.js
import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stats = statSync(srcPath);
    if (stats.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default function copyStatic() {
  return {
    name: "copy-static",
    closeBundle() {
      const src = path.resolve("public");
      const dest = path.resolve("dist");
      copyDir(src, dest);
      console.log("✅ Arquivos de public copiados para dist com sucesso!");
    },
  };
}