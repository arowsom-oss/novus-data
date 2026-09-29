/**
 * Read the first file out of a .zip archive, with Node's own zlib.
 *
 * GDELT publishes each fifteen-minute event export as a single-entry zip.
 * Rule 4 forbids adding a dependency without asking, and a zip library would
 * be a large one for a small job: a zip is a directory at the end of the file
 * pointing at raw DEFLATE data, which `zlib.inflateRawSync` already reads.
 *
 * The central directory is used for sizes rather than the local header,
 * because writers that stream (flag bit 3) leave the local sizes as zero.
 * Output is capped, so a hostile or corrupt archive cannot exhaust memory.
 * Zip64 archives are refused — no GDELT export comes near 4 GB.
 */

import { inflateRawSync } from 'node:zlib';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

export class ZipError extends Error {}

export function unzipFirstEntry(buffer: Buffer): Buffer {
  if (buffer.length < 22) throw new ZipError('too short to be a zip archive');

  // The end-of-central-directory record is the last 22 bytes, unless a
  // trailing comment (at most 65,535 bytes) follows it.
  let eocd = -1;
  const floor = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= floor; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd === -1) throw new ZipError('no end-of-central-directory record');

  const entries = buffer.readUInt16LE(eocd + 10);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (entries < 1) throw new ZipError('the archive is empty');
  if (directoryOffset === 0xffffffff) throw new ZipError('zip64 archives are not supported');
  if (directoryOffset + 46 > buffer.length || buffer.readUInt32LE(directoryOffset) !== CENTRAL_SIGNATURE) {
    throw new ZipError('central directory not found where the archive says it is');
  }

  const method = buffer.readUInt16LE(directoryOffset + 10);
  const compressedSize = buffer.readUInt32LE(directoryOffset + 20);
  const uncompressedSize = buffer.readUInt32LE(directoryOffset + 24);
  const localOffset = buffer.readUInt32LE(directoryOffset + 42);

  if (uncompressedSize > MAX_OUTPUT_BYTES) throw new ZipError('entry is larger than this reader accepts');
  if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) {
    throw new ZipError('local file header not found');
  }

  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLength + extraLength;
  const end = start + compressedSize;
  if (end > buffer.length) throw new ZipError('entry runs past the end of the archive');
  const data = buffer.subarray(start, end);

  if (method === 0) return data;
  if (method === 8) {
    const output = inflateRawSync(data, { maxOutputLength: MAX_OUTPUT_BYTES });
    if (uncompressedSize !== 0 && output.length !== uncompressedSize) {
      throw new ZipError('decompressed size does not match the archive directory');
    }
    return output;
  }
  throw new ZipError(`compression method ${method} is not supported`);
}
