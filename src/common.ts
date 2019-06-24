export abstract class Result<T, E> {
  static Ok<T, E>(value: T): Ok<T, E> {
    return new Ok(value)
  }

  static Fail<T, E>(value: E): Fail<T, E> {
    return new Fail(value)
  }

  constructor(public value: T | E) {}

  match<K, U>({ ok, fail }: { ok: (v: T) => K; fail: (e: E) => U }): K | U {
    throw new Error()
  }
}

class Ok<T, E> extends Result<T, E> {
  constructor(public value: T) {
    super(value)
  }

  match<K, U>({ ok, fail }: { ok: (v: T) => K; fail: (e: E) => U }): K | U {
    return ok(this.value)
  }
}

class Fail<T, E> extends Result<T, E> {
  constructor(public value: E) {
    super(value)
  }

  match<K, U>({ ok, fail }: { ok: (v: T) => K; fail: (e: E) => U }): K | U {
    return fail(this.value)
  }
}

export function notImplemented(): never {
  throw new Error("Not implemented")
}
