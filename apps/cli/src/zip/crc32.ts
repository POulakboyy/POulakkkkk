/**
 * CRC-32 (IEEE 802.3, reflected polynomial 0xEDB88320) as used by ZIP, gzip and PNG.
 * Table-driven; `previous` lets callers checksum a stream chunk by chunk.
 */

const TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 of `data`, continuing from the CRC of the preceding chunks (`0` to start). */
export function crc32(data: Uint8Array, previous = 0): number {
  let crc = (previous ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) {
    crc = (TABLE[(crc ^ (data[i] as number)) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
