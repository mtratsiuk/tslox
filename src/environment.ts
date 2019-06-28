import { LoxValue, RuntimeError } from "./interpreter"
import { Token } from "./token"

export class Environment {
  private readonly values = new Map<string, LoxValue>()

  define(name: Token, value: LoxValue): void {
    this.values.set(name.lexeme, value)
  }

  get(name: Token) {
    const value = this.values.get(name.lexeme)

    if (value !== undefined) {
      return value
    }

    throw new RuntimeError(name, `Variable ${name.lexeme} is undefined`)
  }
}
