import { Token } from "./token"
import { TokenType } from "./token-type"
import { Result } from "./common"
import * as Expr from "./expr"
import * as Stmt from "./stmt"

export class ParseError extends Error {
  constructor(public token: Token, public message: string) {
    super(message)
  }
}

export class Parser {
  private tokens: Token[]
  private current: number = 0
  private errors: ParseError[] = []

  constructor(tokens: Token[]) {
    if (tokens.length === 0) {
      throw new Error("Expected non-empty array of tokens")
    }

    this.tokens = tokens
  }

  static parse(tokens: Token[]) {
    return new Parser(tokens).parse()
  }

  parse(): Result<Stmt.Stmt[], ParseError[]> {
    const statements = []

    while (!this.isAtEnd()) {
      try {
        statements.push(this.declaration())
      } catch (error) {
        this.errors.push(error)
        this.synchronize()
      }
    }

    if (this.errors.length === 0) {
      return Result.Ok(statements)
    }

    return Result.Fail(this.errors)
  }

  private binary = (
    operation: () => Expr.Expr,
    ...types: TokenType[]
  ) => () => {
    let expr = operation()

    while (this.match(...types)) {
      const op = this.previous()
      const right = operation()

      expr = new Expr.Binary(expr, op, right)
    }

    return expr
  }

  private primary(): Expr.Expr {
    if (this.match(TokenType.FALSE)) return new Expr.Literal(false)
    if (this.match(TokenType.TRUE)) return new Expr.Literal(true)
    if (this.match(TokenType.NIL)) return new Expr.Literal(null)

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Expr.Literal(this.previous().literal)
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Expr.Variable(this.previous())
    }

    this.consume(TokenType.LEFT_PAREN, "Expected expression")
    const expr = this.expression()
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression")

    return new Expr.Grouping(expr)
  }

  private unary: () => Expr.Expr = () => {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      return new Expr.Unary(this.previous(), this.unary())
    }

    return this.primary()
  }

  private multiplication = this.binary(
    this.unary,
    TokenType.SLASH,
    TokenType.STAR
  )

  private addition = this.binary(
    this.multiplication,
    TokenType.PLUS,
    TokenType.MINUS
  )

  private comparison = this.binary(
    this.addition,
    TokenType.GREATER,
    TokenType.GREATER_EQUAL,
    TokenType.LESS,
    TokenType.LESS_EQUAL
  )

  private equality = this.binary(
    this.comparison,
    TokenType.BANG_EQUAL,
    TokenType.EQUAL_EQUAL
  )

  private ternary(): Expr.Expr {
    let expr = this.equality()

    if (this.match(TokenType.QUESTION)) {
      const left = this.equality()
      this.consume(TokenType.COLON, "Expected ':' in ternary expression")
      const right = this.ternary()

      expr = new Expr.Ternary(expr, left, right)
    }

    return expr
  }

  private assignment(): Expr.Expr {
    const expr = this.ternary()

    if (this.match(TokenType.EQUAL)) {
      const op = this.previous()
      const value = this.assignment()

      if (expr instanceof Expr.Variable) {
        return new Expr.Assign(expr, value)
      }

      throw new ParseError(op, "Invalid assignment target")
    }

    return expr
  }

  private expression(): Expr.Expr {
    return this.assignment()
  }

  private statement(): Stmt.Stmt {
    if (this.match(TokenType.PRINT)) {
      return this.printStatement()
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      return this.blockStatement()
    }

    return this.expressionStatement()
  }

  private printStatement(): Stmt.Print {
    const expr = this.expression()
    this.consume(TokenType.SEMICOLON, "Expected ';' after print statement")
    return new Stmt.Print(expr)
  }

  private expressionStatement(): Stmt.Expression {
    const expr = this.expression()
    this.consume(TokenType.SEMICOLON, "Expected ';' expression")
    return new Stmt.Expression(expr)
  }

  private blockStatement(): Stmt.Block {
    const statements = []

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration())
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after block")

    return new Stmt.Block(statements)
  }

  private declaration(): Stmt.Stmt {
    if (this.match(TokenType.VAR)) {
      return this.varDeclaration()
    }

    return this.statement()
  }

  private varDeclaration(): Stmt.Var {
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name")
    const initializer = this.match(TokenType.EQUAL)
      ? this.expression()
      : undefined

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration")
    return new Stmt.Var(new Expr.Variable(name), initializer)
  }

  private synchronize(): void {
    this.advance()

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return
      }

      this.advance()
    }
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance()
    }

    throw new ParseError(this.peek(), message)
  }

  private match(...types: TokenType[]): boolean {
    for (let type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }

    return false
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1
    }

    return this.previous()
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private previous(): Token {
    return this.tokens[this.current - 1]
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF
  }
}
