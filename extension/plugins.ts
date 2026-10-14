// Compression plugins, built for both wasm32 and wasm64 (to match build of h5wasm in use)
import { type Plugin } from '@h5web/h5wasm';
import bitgroom from 'h5wasm-plugins/plugins/libH5Zbitgroom.so';
import bitround from 'h5wasm-plugins/plugins/libH5Zbitround.so';
import blosc from 'h5wasm-plugins/plugins/libH5Zblosc.so';
import blosc2 from 'h5wasm-plugins/plugins/libH5Zblosc2.so';
import bshuf from 'h5wasm-plugins/plugins/libH5Zbshuf.so';
import bz2 from 'h5wasm-plugins/plugins/libH5Zbz2.so';
import jpeg from 'h5wasm-plugins/plugins/libH5Zjpeg.so';
import lz4 from 'h5wasm-plugins/plugins/libH5Zlz4.so';
import lzf from 'h5wasm-plugins/plugins/libH5Zlzf.so';
import zfp from 'h5wasm-plugins/plugins/libH5Zzfp.so';
import zstd from 'h5wasm-plugins/plugins/libH5Zzstd.so';
import bitgroom64 from 'h5wasm-plugins/wasm64/plugins/libH5Zbitgroom.so';
import bitround64 from 'h5wasm-plugins/wasm64/plugins/libH5Zbitround.so';
import blosc64 from 'h5wasm-plugins/wasm64/plugins/libH5Zblosc.so';
import blosc264 from 'h5wasm-plugins/wasm64/plugins/libH5Zblosc2.so';
import bshuf64 from 'h5wasm-plugins/wasm64/plugins/libH5Zbshuf.so';
import bz264 from 'h5wasm-plugins/wasm64/plugins/libH5Zbz2.so';
import jpeg64 from 'h5wasm-plugins/wasm64/plugins/libH5Zjpeg.so';
import lz464 from 'h5wasm-plugins/wasm64/plugins/libH5Zlz4.so';
import lzf64 from 'h5wasm-plugins/wasm64/plugins/libH5Zlzf.so';
import zfp64 from 'h5wasm-plugins/wasm64/plugins/libH5Zzfp.so';
import zstd64 from 'h5wasm-plugins/wasm64/plugins/libH5Zzstd.so';

export const PLUGINS = {
  wasm32: {
    bshuf,
    bitgroom,
    bitround,
    blosc,
    blosc2,
    bz2,
    jpeg,
    lz4,
    lzf,
    zfp,
    zstd,
  },
  wasm64: {
    bitgroom: bitgroom64,
    bitround: bitround64,
    blosc: blosc64,
    blosc2: blosc264,
    bshuf: bshuf64,
    bz2: bz264,
    jpeg: jpeg64,
    lz4: lz464,
    lzf: lzf64,
    zfp: zfp64,
    zstd: zstd64,
  },
} satisfies Record<'wasm32' | 'wasm64', Record<Plugin, string>>;
