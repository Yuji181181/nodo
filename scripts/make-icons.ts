import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function pixel(x: number, y: number, size: number): [number, number, number, number] {
  const pad = size * 0.08;
  const radius = size * 0.22;
  const left = pad;
  const right = size - pad;
  const top = pad;
  const bottom = size - pad;
  const insideRounded = rounded(x + 0.5, y + 0.5, left, top, right, bottom, radius);
  if (!insideRounded) return [0, 0, 0, 0];

  const barRight = left + (right - left) * 0.34;
  if (x < barRight) return [247, 246, 243, 255];

  const lineLeft = barRight + size * 0.1;
  const lineRight = right - size * 0.12;
  const lines = [0.34, 0.48, 0.62];
  for (const ratio of lines) {
    const center = top + (bottom - top) * ratio;
    const thickness = Math.max(1.4, size * 0.035);
    if (x >= lineLeft && x <= lineRight && Math.abs(y - center) <= thickness) {
      return [247, 246, 243, 255];
    }
  }
  return [55, 53, 47, 255];
}

function rounded(
  x: number,
  y: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number,
): boolean {
  if (x < left || x > right || y < top || y > bottom) return false;
  const centers = [
    [left + radius, top + radius],
    [right - radius, top + radius],
    [left + radius, bottom - radius],
    [right - radius, bottom - radius],
  ];
  const inCorner =
    (x < left + radius && y < top + radius) ||
    (x > right - radius && y < top + radius) ||
    (x < left + radius && y > bottom - radius) ||
    (x > right - radius && y > bottom - radius);
  if (!inCorner) return true;
  return centers.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2);
}

function png(size: number): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y, size);
      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const directory = resolve(import.meta.dir, '../public/icon');
mkdirSync(directory, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const path = resolve(directory, `${size}.png`);
  writeFileSync(path, png(size));
  console.log(path);
}
