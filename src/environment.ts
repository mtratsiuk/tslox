import { LoxValue, RuntimeError } from "./interpreter"
import { Token } from "./token"

export class Environment {
  private readonly values = new Map<string, LoxValue>()

  constructor(private readonly enclosing?: Environment) {}

  define(name: Token, value: LoxValue): void {
    this.values.set(name.lexeme, value)
  }

  assign(name: Token, value: LoxValue): void {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value)
      return
    }

    if (this.enclosing) {
      return this.enclosing.assign(name, value)
    }

    return this.undefinedVariableError(name)
  }

  get(name: Token): LoxValue {
    const value = this.values.get(name.lexeme)

    if (value !== undefined) {
      return value
    }

    if (this.enclosing) {
      return this.enclosing.get(name)
    }

    return this.undefinedVariableError(name)
  }

  private undefinedVariableError(name: Token): never {
    throw new RuntimeError(name, `Variable ${name.lexeme} is undefined`)
  }
}
