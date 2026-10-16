/**
 * libheif-js ships no friendly TypeScript types (only the low-level
 * Emscripten bindings). The typed surface lives in ./heic.ts
 * (HeifDecoderLike / HeifImageLike); this declaration just tells TS
 * the module exists so the lazy `import("libheif-js/wasm-bundle")`
 * is not an implicit-any error.
 */
declare module "libheif-js/wasm-bundle";
