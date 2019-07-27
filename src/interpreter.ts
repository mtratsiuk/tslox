import * as Expr from "./expr"
import * as Stmt from "./stmt"
import { TokenType } from "./token-type"
import { Literal, Token } from "./token"
import { Result } from "./common"
import { Environment } from "./environment"

export type LoxValue = Literal | object

export class RuntimeError extends Error {
  constructor(public token: Token, public message: string) {
    super(message)
  }
}

export class Interpreter
  implements Expr.Visitor<LoxValue>, Stmt.Visitor<LoxValue> {
  static interpret(statements: Stmt.Stmt[]) {
    return new Interpreter().interpret(statements)
  }

  private environment = new Environment()
  private reachedBreakStmt: boolean = false

  interpret(statements: Stmt.Stmt[]): Result<LoxValue, RuntimeError> {
    try {
      return Result.Ok(this.exec(statements))
    } catch (error) {
      return Result.Fail(error)
    }
  }

  exec(statements: Stmt.Stmt[]): LoxValue
  exec(statements: Stmt.Stmt): LoxValue

  exec(statements: Stmt.Stmt | Stmt.Stmt[]): LoxValue {
    if (!Array.isArray(statements)) {
      return statements.accept(this)
    }

    return statements.reduce((_, s) => this.exec(s), null as LoxValue)
  }

  eval(expr: Expr.Expr): LoxValue {
    return expr.accept(this)
  }

  visitExpressionStmt(stmt: Stmt.Expression): LoxValue {
    return this.eval(stmt.expression)
  }

  visitPrintStmt(stmt: Stmt.Print): LoxValue {
    console.log(stringify(this.eval(stmt.expression)))
    return null
  }

  visitVarStmt(stmt: Stmt.Var): LoxValue {
    const value = stmt.initializer ? this.eval(stmt.initializer) : null

    this.environment.define(stmt.variable.name, value)

    return null
  }

  visitBlockStmt(stmt: Stmt.Block): LoxValue {
    return this.execBlock(stmt.statements, new Environment(this.environment))
  }

  visitIfStmt(stmt: Stmt.If): LoxValue {
    if (isTruthy(this.eval(stmt.condition))) {
      this.exec(stmt.thenBranch)
    } else if (stmt.elseBranch) {
      this.exec(stmt.elseBranch)
    }

    return null
  }

  visitWhileStmt(stmt: Stmt.While): LoxValue {
    while (isTruthy(this.eval(stmt.condition))) {
      this.exec(stmt.body)

      if (this.reachedBreakStmt) {
        this.reachedBreakStmt = false
        break
      }
    }

    return null
  }

  visitBreakStmt(_stmt: Stmt.Break): LoxValue {
    this.reachedBreakStmt = true

    return null
  }

  visitVariableExpr(expr: Expr.Variable): LoxValue {
    return this.environment.get(expr.name)
  }

  visitAssignExpr(expr: Expr.Assign): LoxValue {
    const value = this.eval(expr.value)

    this.environment.assign(expr.variable.name, value)

    return value
  }

  visitBinaryExpr(expr: Expr.Binary): LoxValue {
    const op = binaryOperators[expr.operator.type]

    if (op) {
      return op(expr.operator, this.eval(expr.left), this.eval(expr.right))
    }

    throw new Error()
  }

  visitTernaryExpr(expr: Expr.Ternary): LoxValue {
    if (isTruthy(this.eval(expr.condition))) {
      return this.eval(expr.left)
    }

    return this.eval(expr.right)
  }

  visitLogicalExpr(expr: Expr.Logical): LoxValue {
    const left = this.eval(expr.left)

    if (expr.operator.type === TokenType.OR) {
      if (isTruthy(left)) {
        return left
      }
    } else if (!isTruthy(left)) {
      return left
    }

    return this.eval(expr.right)
  }

  visitGroupingExpr(expr: Expr.Grouping): LoxValue {
    return this.eval(expr.expression)
  }

  visitLiteralExpr(expr: Expr.Literal): LoxValue {
    return expr.value
  }

  visitUnaryExpr(expr: Expr.Unary): LoxValue {
    const op = unaryOperators[expr.operator.type]

    if (op) {
      return op(expr.operator, this.eval(expr.right))
    }

    throw new Error()
  }

  private execBlock(
    statements: Stmt.Stmt[],
    environment: Environment
  ): LoxValue {
    const previous = this.environment

    try {
      this.environment = environment

      for (let stmt of statements) {
        this.exec(stmt)

        if (this.reachedBreakStmt) {
          break
        }
      }

      return null
    } finally {
      this.environment = previous
    }
  }
}

export const isString = (v: LoxValue): v is string => typeof v === "string"

export const isNumber = (v: LoxValue): v is number => typeof v === "number"

export const isNil = (v: LoxValue): v is null => v === null

export const isTruthy = (v: LoxValue) => v !== null && v !== false

export const stringify = (v: LoxValue): string =>
  isNil(v) ? "nil" : v.toString()

const checkOperands = <T extends LoxValue>(
  assert: (v: LoxValue) => v is T,
  message: string,
  next?: Function
) => (func: (...operands: T[]) => LoxValue) => (
  operator: Token,
  ...operands: LoxValue[]
): LoxValue => {
  if (operands.every(assert)) {
    return func(...(operands as T[]))
  }

  if (next) {
    return next(func)(operator, ...operands)
  }

  throw new RuntimeError(operator, message)
}

const checkNumberOperands = checkOperands(isNumber, "Operands must be a number")

const numberOrStringErrorMessage = "Operands must be two numbers or two strings"
const checkNumberOrStringOperands = checkOperands(
  isNumber,
  numberOrStringErrorMessage,
  checkOperands(isString, numberOrStringErrorMessage)
)

type OperatorsMap = Partial<
  Record<TokenType, (operator: Token, ...operands: LoxValue[]) => LoxValue>
>

const unaryOperators: OperatorsMap = {
  [TokenType.BANG]: (_, v) => !isTruthy(v),
  [TokenType.MINUS]: checkNumberOperands(v => -v)
}

const binaryPlusOperator = (op: Token, a: LoxValue, b: LoxValue): LoxValue => {
  if (isNumber(a) && isNumber(b)) {
    return a + b
  }

  if (isString(a) || isString(b)) {
    return stringify(a) + stringify(b)
  }

  throw new RuntimeError(
    op,
    "Operands must be two numbers or one of them must be a string"
  )
}

const binarySlashOperator = (op: Token, a: LoxValue, b: LoxValue): LoxValue => {
  if (b === 0) {
    throw new RuntimeError(op, "Division by zero")
  }

  return checkNumberOperands((a, b) => a / b)(op, a, b)
}

const binaryOperators: OperatorsMap = {
  [TokenType.PLUS]: binaryPlusOperator,
  [TokenType.MINUS]: checkNumberOperands((a, b) => a - b),
  [TokenType.SLASH]: binarySlashOperator,
  [TokenType.STAR]: checkNumberOperands((a, b) => a * b),

  [TokenType.GREATER]: checkNumberOrStringOperands((a, b) => a > b),
  [TokenType.GREATER_EQUAL]: checkNumberOrStringOperands((a, b) => a >= b),
  [TokenType.LESS]: checkNumberOrStringOperands((a, b) => a < b),
  [TokenType.LESS_EQUAL]: checkNumberOrStringOperands((a, b) => a <= b),

  [TokenType.EQUAL_EQUAL]: (_, a, b) => a === b,
  [TokenType.BANG_EQUAL]: (_, a, b) => a !== b
}
