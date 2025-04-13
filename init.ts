import { existsSync, symlinkSync, unlinkSync } from "fs";

function init() {
  const path = "./apps/webui/src/types";
  if (existsSync(path)) {
    unlinkSync(path);
  }
  symlinkSync("../../../libs/types/src", path, "junction");
  console.log("linked to @pan/types");
}

init();
