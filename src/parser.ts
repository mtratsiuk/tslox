import { Token } from "./token"
import { TokenType } from "./token-type"
import { Result } from "./common"
import * as Expr from "./expr"
import * as Stmt from "./stmt"

const MAX_ARGUMENTS_COUNT = 255
const MAX_PARAMETERS_COUNT = 8

export class ParseError extends Error {
  constructor(public token: Token, public message: string) {
    super(message)
  }
}

export class Parser {
  private tokens: Token[]
  private current: number = 0
  private errors: ParseError[] = []
  private context: Context = new Context()

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

  private call(): Expr.Expr {
    let expr = this.primary()

    while (this.match(TokenType.LEFT_PAREN)) {
      const args: Expr.Expr[] = []

      if (!this.check(TokenType.RIGHT_PAREN)) {
        do {
          if (args.length >= MAX_ARGUMENTS_COUNT) {
            this.errors.push(
              new ParseError(
                this.peek(),
                `Cannot have more than ${MAX_ARGUMENTS_COUNT} arguments`
              )
            )
          }

          args.push(this.expression())
        } while (this.match(TokenType.COMMA))
      }

      const paren = this.consume(
        TokenType.RIGHT_PAREN,
        "Expected ')' after arguments"
      )

      expr = new Expr.Call(expr, paren, args)
    }

    return expr
  }

  private unary: () => Expr.Expr = () => {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      return new Expr.Unary(this.previous(), this.unary())
    }

    return this.call()
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

  private logical(): Expr.Expr {
    let expr = this.equality()

    while (this.match(TokenType.OR, TokenType.AND)) {
      const op = this.previous()
      const right = this.equality()

      expr = new Expr.Logical(expr, op, right)
    }

    return expr
  }

  private ternary(): Expr.Expr {
    let expr = this.logical()

    if (this.match(TokenType.QUESTION)) {
      const left = this.logical()
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
    if (this.match(TokenType.IF)) {
      return this.ifStatement()
    }

    if (this.match(TokenType.WHILE)) {
      return this.whileStatement()
    }

    if (this.match(TokenType.FOR)) {
      return this.forStatement()
    }

    if (this.match(TokenType.BREAK)) {
      return this.breakStatement()
    }

    if (this.match(TokenType.RETURN)) {
      return this.returnStatement()
    }

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
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression")
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

  private ifStatement(): Stmt.If {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'")
    const condition = this.expression()
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after 'if' condition")

    const thenBranch = this.statement()
    const elseBranch = this.match(TokenType.ELSE) ? this.statement() : undefined

    return new Stmt.If(condition, thenBranch, elseBranch)
  }

  private whileStatement(): Stmt.While {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'")
    const condition = this.expression()
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after 'while' condition")

    const body = this.withContext(ContextType.LOOP_BODY, () => this.statement())

    return new Stmt.While(condition, body)
  }

  private forStatement(): Stmt.Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'")

    let initializer

    if (this.match(TokenType.SEMICOLON)) {
      initializer = undefined
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration()
    } else {
      initializer = this.expressionStatement()
    }

    let condition

    if (this.match(TokenType.SEMICOLON)) {
      condition = new Expr.Literal(true)
    } else {
      condition = this.expression()
      this.consume(TokenType.SEMICOLON, "Expected ';' after 'for' condition")
    }

    let increment

    if (this.match(TokenType.RIGHT_PAREN)) {
      increment = undefined
    } else {
      increment = this.expression()
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after 'for' clauses")
    }

    let body = this.withContext(ContextType.LOOP_BODY, () => this.statement())

    if (increment) {
      body = new Stmt.Block([body, new Stmt.Expression(increment)])
    }

    body = new Stmt.While(condition, body)

    if (initializer) {
      body = new Stmt.Block([initializer, body])
    }

    return body
  }

  private breakStatement(): Stmt.Stmt {
    if (!this.context.check(ContextType.LOOP_BODY)) {
      throw new ParseError(
        this.previous(),
        "Unexpected 'break' statement outside of loop body"
      )
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after 'break' statement")

    return new Stmt.Break()
  }

  private returnStatement(): Stmt.Stmt {
    const value = this.check(TokenType.SEMICOLON)
      ? undefined
      : this.expression()

    this.consume(TokenType.SEMICOLON, "Expected ';' after 'return' statement")

    return new Stmt.Return(this.previous(), value)
  }

  private declaration(): Stmt.Stmt {
    if (this.match(TokenType.VAR)) {
      return this.varDeclaration()
    }

    if (this.match(TokenType.FUN)) {
      return this.function("function")
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

  private function(kind: string): Stmt.Stmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expected ${kind} name`)
    const params = []

    this.consume(TokenType.LEFT_PAREN, `Expected '(' after ${kind} name`)

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (params.length >= MAX_PARAMETERS_COUNT) {
          this.errors.push(
            new ParseError(
              this.peek(),
              `Cannot have more than ${MAX_PARAMETERS_COUNT} parameters`
            )
          )
        }

        params.push(
          this.consume(TokenType.IDENTIFIER, "Expected parameter name")
        )
      } while (this.match(TokenType.COMMA))
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters")
    this.consume(TokenType.LEFT_BRACE, `Expected '{' before ${kind} body`)

    const body = this.blockStatement()

    return new Stmt.Function(name, params, body)
  }

  private withContext<T>(type: ContextType, cb: () => T): T {
    this.context.push(type)

    try {
      return cb()
    } finally {
      this.context.pop(type)
    }
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

enum ContextType {
  LOOP_BODY
}

export class Context {
  private map: Map<ContextType, boolean[]> = new Map()

  push(type: ContextType): void {
    const ctx = this.map.get(type)

    if (ctx) {
      ctx.push(true)
    } else {
      this.map.set(type, [true])
    }
  }

  pop(type: ContextType): void {
    const ctx = this.map.get(type)

    if (!ctx) {
      throw new Error("Context was not entered")
    }

    ctx.pop()
  }

  check(type: ContextType): boolean {
    const ctx = this.map.get(type)

    return !!ctx && ctx.length > 0
  }
}
