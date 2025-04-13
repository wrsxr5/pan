export function plainText(text: any): Response {
  return new Response(`${text}`, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export function rawResponse(result: any): Response {
  return result as Response;
}

export function toBase64(obj: any) {
  if (obj === undefined) return "";
  return Bun.deflateSync(JSON.stringify(obj)).toBase64();
}

export function fromBase64(base64: string) {
  if (!base64 || base64.length === 0) return undefined;
  const bytes = Bun.inflateSync(Buffer.from(base64, "base64"));
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
