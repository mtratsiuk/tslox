import { LoxValue, RuntimeError } from "./interpreter"
import { Token } from "./token"

export class Environment {
  private readonly values = new Map<string, LoxValue>()

  constructor(private readonly enclosing?: Environment) {}

  define(name: Token | string, value: LoxValue): void {
    this.values.set(name instanceof Token ? name.lexeme : name, value)
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

  assignAt(distance: number, name: Token, value: LoxValue): void {
    this.ancestor(distance).values.set(name.lexeme, value)
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

  getAt(distance: number, name: Token): LoxValue {
    return this.ancestor(distance).get(name)
  }

  private ancestor(distance: number): Environment {
    let environment: Environment = this

    for (let i = 0; i < distance; i += 1) {
      if (!environment.enclosing) {
        throw new Error()
      }

      environment = environment.enclosing
    }

    return environment
  }

  private undefinedVariableError(name: Token): never {
    throw new RuntimeError(name, `Variable ${name.lexeme} is undefined`)
  }
}
