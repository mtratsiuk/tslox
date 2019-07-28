import * as Stmt from "./stmt"
import { Interpreter, LoxValue, ReturnSignal } from "./interpreter"
import { Environment } from "./environment"

export abstract class Callable {
  abstract getArity(): number

  abstract call(interpreter: Interpreter, args: LoxValue[]): LoxValue
}

export class LoxFunction extends Callable {
  constructor(
    readonly declaration: Stmt.Function,
    readonly closure: Environment
  ) {
    super()
  }

  getArity() {
    return this.declaration.params.length
  }

  call(interpreter: Interpreter, args: LoxValue[]): LoxValue {
    const environment = new Environment(this.closure)

    this.declaration.params.forEach((token, index) => {
      environment.define(token, args[index])
    })

    try {
      interpreter.execBlock(this.declaration.body, environment)
    } catch (error) {
      if (error instanceof ReturnSignal) {
        return error.value
      }

      throw error
    }

    return null
  }

  toString() {
    return `<fn ${this.declaration.name.lexeme}(${this.declaration.params
      .map(p => p.lexeme)
      .join(", ")})>`
  }
}
