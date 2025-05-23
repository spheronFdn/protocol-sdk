const BASE = 26;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

function encodeBase26(n: number): string {
  if (n === 0) {
    return "a";
  }

  let result = "";
  while (n > 0) {
    const rem = n % BASE;
    result += ALPHABET[rem];
    n = Math.floor(n / BASE);
  }

  // Reverse the string
  return result.split("").reverse().join("");
}

function decodeBase26(s: string): number {
  let n = 0;
  for (const c of s) {
    if (c < "a" || c > "z") {
      throw new Error("invalid character in base26 string");
    }
    n = n * BASE + (c.charCodeAt(0) - "a".charCodeAt(0));
  }
  return n;
}

export function encodeWithDash(input: string): string {
  const parts = input.split("-");
  if (parts.length !== 2) {
    throw new Error("invalid input format");
  }

  const n1 = parseInt(parts[0], 10);
  const n2 = parseInt(parts[1], 10);

  if (isNaN(n1) || isNaN(n2)) {
    throw new Error("invalid number format");
  }

  const encoded1 = encodeBase26(n1);
  const encoded2 = encodeBase26(n2);

  return encoded1 + "-" + encoded2;
}

export function decodeWithDash(encoded: string): string {
  const parts = encoded.split("-");
  if (parts.length !== 2) {
    throw new Error("encoded string must contain exactly one dash");
  }

  const n1 = decodeBase26(parts[0]);
  const n2 = decodeBase26(parts[1]);

  return `${n1}-${n2}`;
}
