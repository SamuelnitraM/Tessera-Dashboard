import koffi, { type TypeObject } from 'koffi'

/**
 * Appels COM et WinRT via koffi (sans rien compiler) : création d'objets, méthodes lues dans leur
 * table virtuelle, chaînes HSTRING et attente des opérations asynchrones de WinRT. Les pointeurs
 * d'interface sont libérés par `release` (ou un `Scope`).
 */

export type Pointer = unknown

const ole32 = koffi.load('ole32.dll')
const combase = koffi.load('combase.dll')
const shcore = koffi.load('shcore.dll')

koffi.struct('SYS_GUID', {
  a: 'uint32_t',
  b: 'uint16_t',
  c: 'uint16_t',
  d: koffi.array('uint8_t', 8)
})

/* eslint-disable @typescript-eslint/no-explicit-any -- signatures décrites par koffi */
const api = {
  CoInitializeEx: ole32.func('long __stdcall CoInitializeEx(void *reserved, uint32_t flags)'),
  CoCreateInstance: ole32.func(
    'long __stdcall CoCreateInstance(SYS_GUID *clsid, void *outer, uint32_t context, SYS_GUID *iid, _Out_ void **object)'
  ),
  CoTaskMemFree: ole32.func('void __stdcall CoTaskMemFree(void *memory)'),
  PropVariantClear: ole32.func('long __stdcall PropVariantClear(uint8_t *value)'),
  RoGetActivationFactory: combase.func(
    'long __stdcall RoGetActivationFactory(void *classId, SYS_GUID *iid, _Out_ void **factory)'
  ),
  WindowsCreateString: combase.func(
    'long __stdcall WindowsCreateString(const char16_t *text, uint32_t length, _Out_ void **hstring)'
  ),
  WindowsDeleteString: combase.func('long __stdcall WindowsDeleteString(void *hstring)'),
  WindowsGetStringRawBuffer: combase.func(
    'const char16_t * __stdcall WindowsGetStringRawBuffer(void *hstring, _Out_ uint32_t *length)'
  ),
  CreateStreamOverRandomAccessStream: shcore.func(
    'long __stdcall CreateStreamOverRandomAccessStream(void *stream, SYS_GUID *iid, _Out_ void **object)'
  )
} as Record<string, (...args: any[]) => any>

/** Multithread : les objets de Core Audio et des contrôles multimédias s'y utilisent directement. */
export function initCom(): void {
  api.CoInitializeEx(null, 0 /* COINIT_MULTITHREADED */)
}

type Guid = { a: number; b: number; c: number; d: number[] }
const guids = new Map<string, Guid>()

/** `{A95664D2-…}` → structure GUID. */
export function guid(text: string): Guid {
  let value = guids.get(text)
  if (!value) {
    const hex = text.replace(/[{}-]/g, '')
    value = {
      a: parseInt(hex.slice(0, 8), 16),
      b: parseInt(hex.slice(8, 12), 16),
      c: parseInt(hex.slice(12, 16), 16),
      d: Array.from({ length: 8 }, (_value, index) =>
        parseInt(hex.slice(16 + index * 2, 18 + index * 2), 16)
      )
    }
    guids.set(text, value)
  }
  return value
}

/** GUID vide (contexte des changements de volume). */
export const GUID_NULL = guid('00000000-0000-0000-0000-000000000000')

export class HResultError extends Error {
  constructor(
    readonly hr: number,
    what: string
  ) {
    super(`${what} : 0x${(hr >>> 0).toString(16).padStart(8, '0')}`)
  }
}

/** Échec (HRESULT négatif) → exception. */
export function check(hr: number, what = 'COM'): number {
  if (hr < 0) throw new HResultError(hr, what)
  return hr
}

/** Prototypes des méthodes, un par signature (koffi demande un nom unique). */
const protos = new Map<string, TypeObject>()

function protoOf(result: string, params: string[]): TypeObject {
  const key = `${result}(${params.join(',')})`
  let proto = protos.get(key)
  if (!proto) {
    proto = koffi.proto(
      `${result} __stdcall SysMethod${protos.size}(void *self${params.map((p) => `, ${p}`).join('')})`
    )
    protos.set(key, proto)
  }
  return proto
}

/**
 * Appelle la méthode n° `index` de la table virtuelle de l'interface `self`. `params` décrit
 * les arguments après `self` (syntaxe de koffi), le résultat est un HRESULT sauf `result`.
 */
export function invoke(
  self: Pointer,
  index: number,
  params: string[],
  args: unknown[],
  result = 'long'
): any {
  const table = koffi.decode(self, 'void *')
  const method = koffi.decode(table, index * 8, 'void *')
  return koffi.call(method, protoOf(result, params), self, ...args)
}

/** Appelle une méthode qui renvoie un HRESULT, et échoue avec lui. */
export function call(
  self: Pointer,
  index: number,
  params: string[],
  args: unknown[],
  what: string
): number {
  return check(invoke(self, index, params, args) as number, what)
}

/** Méthode `(self, _Out_ T *value)` : renvoie la valeur. */
export function get<T>(self: Pointer, index: number, type: string, what: string): T {
  const out: unknown[] = [type.endsWith('*') ? null : 0]
  call(self, index, [`_Out_ ${type} *`], [out], what)
  return out[0] as T
}

/** Méthode qui renvoie une interface (`null` si l'objet n'en a pas, comme une pochette absente). */
export function getObject(self: Pointer, index: number, what: string): Pointer | null {
  return get<Pointer | null>(self, index, 'void *', what) || null
}

export function release(self: Pointer | null | undefined): void {
  if (self) invoke(self, 2, [], [], 'uint32_t')
}

/** Interface `iid` de l'objet, ou `null` s'il ne l'a pas. */
export function queryInterface(self: Pointer, iid: string): Pointer | null {
  const out: unknown[] = [null]
  const hr = invoke(self, 0, ['SYS_GUID *', '_Out_ void **'], [guid(iid), out]) as number
  return hr >= 0 && out[0] ? out[0] : null
}

export function createInstance(clsid: string, iid: string): Pointer {
  const out: unknown[] = [null]
  check(api.CoCreateInstance(guid(clsid), null, 23 /* CLSCTX_ALL */, guid(iid), out), clsid)
  return out[0]
}

/** Pointeurs à libérer ensemble (dans l'ordre inverse), quoi qu'il arrive. */
export class Scope {
  private items: Pointer[] = []

  add<T extends Pointer | null>(pointer: T): T {
    if (pointer) this.items.push(pointer)
    return pointer
  }

  /** Garde un pointeur au-delà du scope (l'appelant le libérera). */
  keep(pointer: Pointer): Pointer {
    this.items = this.items.filter((item) => item !== pointer)
    return pointer
  }

  release(): void {
    for (const item of this.items.reverse()) release(item)
    this.items = []
  }
}

export function scoped<T>(run: (scope: Scope) => T): T {
  const scope = new Scope()
  try {
    return run(scope)
  } finally {
    scope.release()
  }
}

export async function scopedAsync<T>(run: (scope: Scope) => Promise<T>): Promise<T> {
  const scope = new Scope()
  try {
    return await run(scope)
  } finally {
    scope.release()
  }
}

/** Libère une chaîne renvoyée par Windows (CoTaskMemAlloc). */
export function freeTaskMemory(pointer: Pointer | null): void {
  if (pointer) api.CoTaskMemFree(pointer)
}

/** Chaîne UTF-16 renvoyée par Windows (`LPWSTR` à libérer par CoTaskMemFree), lue puis libérée. */
export function takeTaskString(pointer: Pointer | null): string | null {
  if (!pointer) return null
  try {
    return koffi.decode(pointer, 'char16_t', -1) as string
  } finally {
    api.CoTaskMemFree(pointer)
  }
}

/** PROPVARIANT : 24 octets (type, puis valeur à l'octet 8). */
export function propVariant(): Uint8Array {
  return new Uint8Array(24)
}

/** Texte d'un PROPVARIANT (VT_LPWSTR), puis le libère. */
export function propVariantText(value: Uint8Array): string | null {
  try {
    const view = new DataView(value.buffer, value.byteOffset)
    if (view.getUint16(0, true) !== 31 /* VT_LPWSTR */) return null
    return (koffi.decode(value, 8, 'const char16_t *') as string | null) ?? null
  } finally {
    api.PropVariantClear(value)
  }
}

// ---------------------------------------------------------------------------
// WinRT
// ---------------------------------------------------------------------------

/** HSTRING créée pour un appel, libérée par `deleteHString`. */
export function hstring(text: string): Pointer {
  const out: unknown[] = [null]
  check(api.WindowsCreateString(text, text.length, out), 'WindowsCreateString')
  return out[0]
}

export function deleteHString(value: Pointer | null): void {
  if (value) api.WindowsDeleteString(value)
}

/** Texte d'une HSTRING renvoyée par une méthode (puis libérée). Vide si `null`. */
export function takeHString(value: Pointer | null): string {
  if (!value) return ''
  try {
    const length: number[] = [0]
    return (api.WindowsGetStringRawBuffer(value, length) as string | null) ?? ''
  } finally {
    api.WindowsDeleteString(value)
  }
}

/** Propriété texte d'un objet WinRT (`get_…` qui renvoie une HSTRING). */
export function getText(self: Pointer, index: number, what: string): string {
  return takeHString(get<Pointer | null>(self, index, 'void *', what))
}

export function activationFactory(className: string, iid: string): Pointer {
  const name = hstring(className)
  try {
    const out: unknown[] = [null]
    check(api.RoGetActivationFactory(name, guid(iid), out), className)
    return out[0]
  } finally {
    deleteHString(name)
  }
}

const IID_ASYNC_INFO = '00000036-0000-0000-C000-000000000046'
const ASYNC_STARTED = 0
const ASYNC_COMPLETED = 1

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Attend la fin d'une opération asynchrone de WinRT (`IAsyncOperation<T>`, libérée ensuite) et
 * renvoie son résultat : une interface (`void *`) ou une valeur (`uint8_t` pour un booléen).
 * L'état est relu régulièrement (pas de rappel à recevoir d'un autre fil).
 */
export async function awaitOperation<T = Pointer>(
  operation: Pointer | null,
  resultType = 'void *',
  timeoutMs = 5000
): Promise<T> {
  if (!operation) throw new Error('WinRT operation missing')
  try {
    const info = queryInterface(operation, IID_ASYNC_INFO)
    if (!info) throw new Error('IAsyncInfo')
    try {
      const start = Date.now()
      for (let wait = 1; ; wait = Math.min(wait * 2, 25)) {
        const status = get<number>(info, 7, 'int32_t', 'IAsyncInfo.Status')
        if (status === ASYNC_COMPLETED) break
        if (status !== ASYNC_STARTED) throw new Error(`WinRT operation status ${status}`)
        if (Date.now() - start > timeoutMs) {
          invoke(info, 9, [], [])
          throw new Error('timeout')
        }
        await sleep(wait)
      }
    } finally {
      release(info)
    }
    // GetResults : 9e méthode d'IAsyncOperation<T> (après put_Completed et get_Completed)
    return get<T>(operation, 8, resultType, 'IAsyncOperation.GetResults')
  } finally {
    release(operation)
  }
}

/** `IStream` qui lit un flux WinRT (pochette d'un titre). */
export function streamOverRandomAccess(stream: Pointer): Pointer {
  const out: unknown[] = [null]
  check(
    api.CreateStreamOverRandomAccessStream(
      stream,
      guid('0000000C-0000-0000-C000-000000000046'),
      out
    ),
    'CreateStreamOverRandomAccessStream'
  )
  return out[0]
}
