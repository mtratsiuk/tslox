import * as Expr from "./expr"
import * as Stmt from "./stmt"
import { Token } from "./token"
import { Result } from "./common"
import { Interpreter } from "./interpreter"

export class ResolveError extends Error {
  constructor(public token: Token, public message: string) {
    super(message)
  }
}

export class Resolver implements Expr.Visitor<void>, Stmt.Visitor<void> {
  private readonly scopes: Record<string, boolean>[] = []
  readonly errors: ResolveError[] = []

  static resolve(options: {
    interpreter: Interpreter
    statements: Stmt.Stmt[]
  }): Result<void, ResolveError[]> {
    const resolver = new Resolver(options.interpreter)

    resolver.resolve(options.statements)

    if (resolver.errors.length === 0) {
      return Result.Ok(undefined)
    }

    return Result.Fail(resolver.errors)
  }

  constructor(private readonly interpreter: Interpreter) {}

  private resolve(stmt: Expr.Expr | Stmt.Stmt | Stmt.Stmt[]): void

  private resolve(stmt: any) {
    if (!Array.isArray(stmt)) {
      return stmt.accept(this)
    }

    stmt.forEach(s => this.resolve(s))
  }

  private resolveLocal(expr: Expr.Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i -= 1) {
      if (this.scopes[i][name.lexeme] !== undefined) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i)
        return
      }
    }
  }

  private resolveFunction(stmt: Stmt.Function) {
    this.beginScope()

    stmt.params.forEach(param => {
      this.declare(param)
      this.define(param)
    })

    this.resolve(stmt.body.statements)

    this.endScope()
  }

  private beginScope() {
    this.scopes.push({})
  }

  private endScope() {
    this.scopes.pop()
  }

  private peekScope() {
    if (this.scopes.length === 0) {
      return
    }

    return this.scopes[this.scopes.length - 1]
  }

  private declare(name: Token) {
    const scope = this.peekScope()

    if (!scope) {
      return
    }

    if (scope[name.lexeme] !== undefined) {
      this.errors.push(
        new ResolveError(
          name,
          "Variable with this name already declared in this scope"
        )
      )
    }

    scope[name.lexeme] = false
  }

  private define(name: Token) {
    const scope = this.peekScope()

    if (!scope) {
      return
    }

    scope[name.lexeme] = true
  }

  visitBlockStmt(stmt: Stmt.Block) {
    this.beginScope()
    this.resolve(stmt.statements)
    this.endScope()
  }

  visitVarStmt(stmt: Stmt.Var) {
    this.declare(stmt.variable.name)

    if (stmt.initializer !== undefined) {
      this.resolve(stmt.initializer)
    }

    this.define(stmt.variable.name)
  }

  visitVariableExpr(expr: Expr.Variable) {
    const scope = this.peekScope()

    if (scope && scope[expr.name.lexeme] === false) {
      this.errors.push(
        new ResolveError(
          expr.name,
          "Cannot read local variable in its own initializer"
        )
      )
    }

    this.resolveLocal(expr, expr.name)
  }

  visitAssignExpr(expr: Expr.Assign) {
    this.resolve(expr.value)
    this.resolveLocal(expr, expr.variable.name)
  }

  visitFunctionStmt(stmt: Stmt.Function) {
    this.declare(stmt.name)
    this.define(stmt.name)

    this.resolveFunction(stmt)
  }

  visitExpressionStmt(stmt: Stmt.Expression) {
    this.resolve(stmt.expression)
  }

  visitIfStmt(stmt: Stmt.If) {
    this.resolve(stmt.condition)
    this.resolve(stmt.thenBranch)

    if (stmt.elseBranch) {
      this.resolve(stmt.elseBranch)
    }
  }

  visitPrintStmt(stmt: Stmt.Print) {
    this.resolve(stmt.expression)
  }

  visitReturnStmt(stmt: Stmt.Return) {
    if (stmt.value) {
      this.resolve(stmt.value)
    }
  }

  visitWhileStmt(stmt: Stmt.While) {
    this.resolve(stmt.condition)
    this.resolve(stmt.body)
  }

  visitBreakStmt(stmt: Stmt.Break) {}

  visitBinaryExpr(expr: Expr.Binary) {
    this.resolve(expr.left)
    this.resolve(expr.right)
  }

  visitCallExpr(expr: Expr.Call) {
    this.resolve(expr.callee)

    expr.args.forEach(arg => this.resolve(arg))
  }

  visitGroupingExpr(expr: Expr.Grouping) {
    this.resolve(expr.expression)
  }

  visitLiteralExpr(expr: Expr.Literal) {}

  visitLogicalExpr(expr: Expr.Logical) {
    this.resolve(expr.left)
    this.resolve(expr.right)
  }

  visitUnaryExpr(expr: Expr.Unary) {
    this.resolve(expr.right)
  }

  visitTernaryExpr(expr: Expr.Ternary) {
    this.resolve(expr.condition)
    this.resolve(expr.left)
    this.resolve(expr.right)
  }
}
