import { TokenType } from "./token-type"

export type Literal = object | null

export class Token {
  constructor(
    readonly type: TokenType,
    readonly lexeme: string,
    readonly literal: Literal,
    readonly line: number
  ) {}

  toString(): string {
    return `${TokenType[this.type]} ${this.lexeme} ${this.literal}`
  }
}
