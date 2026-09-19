import { readFileSync } from "node:fs";
import process from "node:process";

const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const tauriVersion = JSON.parse(
  readFileSync("src-tauri/tauri.conf.json", "utf8"),
).version;
const cargoContents = readFileSync("src-tauri/Cargo.toml", "utf8");
const cargoVersion = cargoContents.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const versions = {
  "package.json": packageVersion,
  "src-tauri/Cargo.toml": cargoVersion,
  "src-tauri/tauri.conf.json": tauriVersion,
};

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageVersion)) {
  throw new Error(`Invalid application version: ${packageVersion}`);
}
for (const [file, version] of Object.entries(versions)) {
  if (version !== packageVersion)
    throw new Error(
      `Version mismatch: ${file} has ${version ?? "no version"}; expected ${packageVersion}.`,
    );
}

const tag = process.argv[2];
if (tag) {
  const tagVersion = tag.startsWith("v") ? tag.slice(1) : tag;
  if (tagVersion !== packageVersion)
    throw new Error(
      `Release tag ${tag} does not match application version ${packageVersion}.`,
    );
}

process.stdout.write(
  `WorDrop version ${packageVersion} is consistent${tag ? ` with tag ${tag}` : ""}.\n`,
);
