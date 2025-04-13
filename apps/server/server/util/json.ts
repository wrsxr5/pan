export async function write(obj: any, file = "log.json") {
  const str = obj === undefined ? "" : JSON.stringify(obj, null, 2);
  await Bun.write(file, str);
}
