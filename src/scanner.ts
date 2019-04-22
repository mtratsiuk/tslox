import { Token, Literal } from "./token"
import { TokenType } from "./token-type"
import { error } from "./lox"

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

  private scanToken(): void {
    const c = this.advance()

    switch (c) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN)
        break
      case ")":
        this.addToken(TokenType.RIGHT_PAREN)
        break
      case "{":
        this.addToken(TokenType.LEFT_BRACE)
        break
      case "}":
        this.addToken(TokenType.RIGHT_BRACE)
        break
      case ",":
        this.addToken(TokenType.COMMA)
        break
      case ".":
        this.addToken(TokenType.DOT)
        break
      case "-":
        this.addToken(TokenType.MINUS)
        break
      case "+":
        this.addToken(TokenType.PLUS)
        break
      case ";":
        this.addToken(TokenType.SEMICOLON)
        break
      case "*":
        this.addToken(TokenType.STAR)
        break
      case "!":
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG)
        break
      case "=":
        this.addToken(this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL)
        break
      case "<":
        this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS)
        break
      case ">":
        this.addToken(this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER)
        break
      default:
        error(this.line, `Unexpected character "${c}"`)
    }
  }

  private advance(): string {
    this.current += 1

    return this.source[this.current - 1]
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.current] !== expected) {
      return false
    }

    this.current += 1

    return true
  }

  private addToken(type: TokenType, literal: Literal = null): void {
    const text = this.source.slice(this.start, this.current)

    this.tokens.push(new Token(type, text, literal, this.line))
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length
  }
}
