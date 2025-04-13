import { normalize } from "path";

interface Input {
  name: string;
  id: string;
  baseUrl: string;
}

interface ActionContext {
  directory: string;
  selectedEntries: string[];
}

function parseArg(): Input | undefined {
  const url = process.argv[2];
  console.log(url);
  if (!url) return;
  const match = url.match(/^panclient:\/\/([^\/]+)\/([0-9a-fA-F-]+)\/(.+)$/);
  if (match) {
    const [, name, id, api] = match;
    return { name, id, baseUrl: decodeURIComponent(api) };
  }
}

async function fetchContext(baseUrl: string, id: string) {
  const resp = await fetch(baseUrl + "/api/action/context/" + id, {
    headers: { cookie: `pan_webui=${id}` },
  });
  return (await resp.json()) as ActionContext;
}

function isPlayable(path: string) {
  return /(\.mkv|\.mp4|.wav|.flac)$/i.test(path);
}

function clientPathOf(path: string) {
  return normalize(
    path
      .replace(/^\/storage/, "V:\\")
      .replace(/^\/download/, "Y:\\")
      .replace(/^\/book/, "Z:\\")
  );
}

function openApp(app: string, path: string) {
  Bun.spawn([app, clientPathOf(path)]);
}

function open({ selectedEntries, directory }: ActionContext) {
  if (selectedEntries[0] && isPlayable(selectedEntries[0])) {
    return openApp("mpv", selectedEntries[0]);
  }
  return openApp("explorer", selectedEntries[0] || directory);
}

async function main() {
  const input = parseArg();
  if (!input) return;
  console.log("action:", input.name);
  console.log("baseUrl:", input.baseUrl);
  try {
    const context = await fetchContext(input.baseUrl, input.id);
    console.log("context:", context);
    if (input.name === "open") {
      open(context);
    }
  } catch (err) {
    console.error(err);
    await Bun.sleep(300_000);
  }
}

await main();
