export function flagContent(value: string) {
  const full = /^CTF\{([\s\S]*)\}$/i.exec(value.trim());
  return full ? full[1] : value;
}

export function completeFlag(value: string) {
  return `CTF{${flagContent(value).trim()}}`;
}
