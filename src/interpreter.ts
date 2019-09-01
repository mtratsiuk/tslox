import * as Expr from "./expr"
import * as Stmt from "./stmt"
import { TokenType } from "./token-type"
import { Literal, Token } from "./token"
import { Result, CustomError } from "./common"
import { Environment } from "./environment"
import { globals } from "./globals"
import { Callable, LoxFunction } from "./callable"

export type LoxValue = Literal | Callable

export class RuntimeError extends CustomError {
  constructor(public token: Token, public message: string) {
    super(message)
  }
}

export class BreakSignal extends CustomError {}

export class ReturnSignal extends CustomError {
  constructor(readonly value: LoxValue) {
    super("")
  }
}

export class Interpreter
  implements Expr.Visitor<LoxValue>, Stmt.Visitor<LoxValue> {
  static interpret(statements: Stmt.Stmt[]) {
    return new Interpreter().interpret(statements)
  }

  private environment = globals
  private locals = new Map<Expr.Expr, number>()

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

  resolve(expr: Expr.Expr, depth: number): void {
    this.locals.set(expr, depth)
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

  visitFunctionStmt(stmt: Stmt.Function): LoxValue {
    const fun = new LoxFunction(stmt, this.environment)

    this.environment.define(stmt.name, fun)

    return null
  }

  visitBlockStmt(stmt: Stmt.Block): LoxValue {
    return this.execBlock(stmt, new Environment(this.environment))
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
      try {
        this.exec(stmt.body)
      } catch (error) {
        if (error instanceof BreakSignal) {
          break
        }

        throw error
      }
    }

    return null
  }

  visitBreakStmt(_stmt: Stmt.Break): LoxValue {
    throw new BreakSignal()
  }

  visitReturnStmt(stmt: Stmt.Return): LoxValue {
    const value = stmt.value ? this.eval(stmt.value) : null

    throw new ReturnSignal(value)
  }

  visitVariableExpr(expr: Expr.Variable): LoxValue {
    return this.lookUpVariable(expr.name, expr)
  }

  visitAssignExpr(expr: Expr.Assign): LoxValue {
    const value = this.eval(expr.value)
    const distance = this.locals.get(expr)

    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.variable.name, value)
    } else {
      globals.assign(expr.variable.name, value)
    }

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

  visitCallExpr(expr: Expr.Call): LoxValue {
    const callee = this.eval(expr.callee)
    const args = expr.args.map(a => this.eval(a))

    if (!(callee instanceof Callable)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes")
    }

    if (args.length !== callee.getArity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${callee.getArity()} arguments but got ${args.length}`
      )
    }

    return callee.call(this, args)
  }

  execBlock(block: Stmt.Block, environment: Environment): LoxValue {
    const previous = this.environment

    try {
      this.environment = environment

      this.exec(block.statements)

      return null
    } finally {
      this.environment = previous
    }
  }

  lookUpVariable(name: Token, expr: Expr.Expr): LoxValue {
    const distance = this.locals.get(expr)

    if (distance !== undefined) {
      return this.environment.getAt(distance, name)
    } else {
      return globals.get(name)
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
