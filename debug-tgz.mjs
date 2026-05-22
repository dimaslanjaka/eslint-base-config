import fs from "fs";
import zlib from "zlib";
import tar from "tar-stream";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addToTree(tree, parts) {
  let node = tree;

  for (const part of parts) {
    if (!node[part]) node[part] = {};
    node = node[part];
  }
}

function printTree(node, prefix = "") {
  const entries = Object.keys(node).sort();

  entries.forEach((key, index) => {
    const isLast = index === entries.length - 1;
    console.log(prefix + (isLast ? "└── " : "├── ") + key);

    const child = node[key];
    const newPrefix = prefix + (isLast ? "    " : "│   ");
    printTree(child, newPrefix);
  });
}

function printTgzTree(filePath) {
  const extract = tar.extract();
  const tree = {};

  extract.on("entry", (header, stream, next) => {
    const parts = header.name.split("/").filter(Boolean);

    if (parts.length) addToTree(tree, parts);

    stream.on("end", next);
    stream.resume();
  });

  extract.on("finish", () => {
    printTree(tree);
  });

  fs.createReadStream(filePath)
    .pipe(zlib.createGunzip())
    .pipe(extract);
}

// usage
spawnSync("yarn", ["pack"], { stdio: "inherit", cwd: __dirname, shell: true });
printTgzTree(path.resolve(__dirname, "package.tgz"));
