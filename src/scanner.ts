import { Token } from "./token"
import { TokenType } from "./token-type"

export class Scanner {
  private readonly source: string
  private readonly tokens: Array<Token> = []

  private start: number = 0
  private current: number = 0
  private line: number = 1

  constructor(source: string) {
    this.source = source
  }

  scanTokens(): Array<Token> {
    while (!this.isAtEnd()) {
      this.start = this.current
      this.scanToken()
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line))
    return this.tokens
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length
  }
}
