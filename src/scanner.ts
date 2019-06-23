import { Token, Literal } from "./token"
import { TokenType } from "./token-type"
import { Result } from './common'

export interface ScanError {
  line: number,
  message: string
}

const keywords: Record<string, TokenType> = {
  and: TokenType.AND,
  class: TokenType.CLASS,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  for: TokenType.FOR,
  fun: TokenType.FUN,
  if: TokenType.IF,
  nil: TokenType.NIL,
  or: TokenType.OR,
  print: TokenType.PRINT,
  return: TokenType.RETURN,
  super: TokenType.SUPER,
  this: TokenType.THIS,
  true: TokenType.TRUE,
  var: TokenType.VAR,
  while: TokenType.WHILE,
}

export class Scanner {
  private readonly source: string
  private readonly tokens: Token[] = []
  private readonly errors: ScanError[] = []

  private start: number = 0
  private current: number = 0
  private line: number = 1

  constructor(source: string) {
    this.source = source
  }

  static scan(source: string) {
    return new Scanner(source).scanTokens()
  }
  
  scanTokens(): Result<Token[], ScanError[]> {
    while (!this.isAtEnd()) {
      this.start = this.current
      this.scanToken()
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line))

    if (this.errors.length === 0) {
      return Result.Ok(this.tokens)
    }

    return Result.Fail(this.errors)
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
      case "/":
        if (this.match("/")) {
          while (this.peek() !== "\n" && !this.isAtEnd()) {
            this.advance()
          }
        } else if (this.match("*")) {
          while (!this.isAtEnd() && !(this.peek() === '*' && this.peekNext() === '/')) {
            if (this.peek() === '\n') {
              this.line += 1
            }

            this.advance()
          }

          if (this.isAtEnd()) {
            this.error(this.line, 'Unterminated multiline comment')
          } else {
            this.advance()
            this.advance()
          }
        } else {
          this.addToken(TokenType.SLASH)
        }
        break

      case " ":
      case "\t":
      case "\r":
        break

      case "\n":
        this.line += 1
        break

      case '"':
        this.scanString()
        break

      default:
        if (this.isDigit(c)) {
          this.scanNumber()
        } else if (this.isAlpha(c)) {
          this.scanIdentifier()
        } else {
          this.error(this.line, `Unexpected character "${c}"`)
        }
    }
  }

  private scanString(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\n") {
        this.line += 1
      }

      this.advance()
    }

    if (this.isAtEnd()) {
      this.error(this.line, "Unterminated string")
      return
    }

    this.advance()

    this.addToken(TokenType.STRING, this.source.slice(this.start + 1, this.current - 1))
  }

  private scanNumber(): void {
    while (this.isDigit(this.peek())) {
      this.advance()
    }

    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance()

      while (this.isDigit(this.peek())) {
        this.advance()
      }
    }

    this.addToken(TokenType.NUMBER, Number(this.source.slice(this.start, this.current)))
  }

  private scanIdentifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance()
    }

    const identifier = this.source.slice(this.start, this.current)
    const type = keywords[identifier]

    this.addToken(type || TokenType.IDENTIFIER)
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

  private peek(): string {
    if (this.isAtEnd()) {
      return "\0"
    }

    return this.source[this.current]
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) {
      return "\0"
    }

    return this.source[this.current + 1]
  }

  private addToken(type: TokenType, literal: Literal = null): void {
    const text = this.source.slice(this.start, this.current)

    this.tokens.push(new Token(type, text, literal, this.line))
  }

  private error(line: number, message: string): void {
    this.errors.push({ line, message })
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length
  }

  private isDigit(c: string) {
    return c >= "0" && c <= "9"
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_"
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c)
  }
}
