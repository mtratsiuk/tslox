import {TokenType} from './token-type'

export class Token {
  constructor (
    readonly type: TokenType,
    readonly lexeme: string,
    readonly literal: object | null,
    readonly line: number
  ) {}

  toString (): string {
    return `${this.type} ${this.lexeme} ${this.literal}`
  }
}
