import * as Expr from "./expr"
import { TokenType } from "./token-type"
import { Literal, Token } from "./token"
import { Result } from "./common"

type LoxValue = Literal | object

type OperatorsMap = Partial<
  Record<TokenType, (operator: Token, ...operands: LoxValue[]) => LoxValue>
>

export class RuntimeError extends Error {
  constructor(public token: Token, public message: string) {
    super(message)
  }
}

export class Interpreter implements Expr.Visitor<LoxValue> {
  static interpret(expr: Expr.Expr): Result<LoxValue, Error> {
    try {
      return Result.Ok(new Interpreter().eval(expr))
    } catch (error) {
      return Result.Fail(error)
    }
  }

  eval(expr: Expr.Expr): LoxValue {
    return expr.accept(this)
  }

  visitBinaryExpr(expr: Expr.Binary): LoxValue {
    const op = binaryOperators[expr.operator.type]

    if (op) {
      return op(expr.operator, this.eval(expr.left), this.eval(expr.right))
    }

    throw new Error()
  }

  visitTernaryExpr(expr: Expr.Ternary): LoxValue {
    throw new Error()
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
}

const isString = (v: LoxValue): v is string => typeof v === "string"

const isNumber = (v: LoxValue): v is number => typeof v === "number"

const isTruthy = (v: LoxValue) => v !== null && v !== false

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

const unaryOperators: OperatorsMap = {
  [TokenType.BANG]: (_, v) => !isTruthy(v),
  [TokenType.MINUS]: checkNumberOperands(v => -v)
}

const binaryOperators: OperatorsMap = {
  [TokenType.PLUS]: checkNumberOrStringOperands((a, b) => a + b),
  [TokenType.MINUS]: checkNumberOperands((a, b) => a - b),
  [TokenType.SLASH]: checkNumberOperands((a, b) => a / b),
  [TokenType.STAR]: checkNumberOperands((a, b) => a * b),

  [TokenType.GREATER]: checkNumberOperands((a, b) => a > b),
  [TokenType.GREATER_EQUAL]: checkNumberOperands((a, b) => a >= b),
  [TokenType.LESS]: checkNumberOperands((a, b) => a < b),
  [TokenType.LESS_EQUAL]: checkNumberOperands((a, b) => a <= b),

  [TokenType.EQUAL_EQUAL]: (_, a, b) => a === b,
  [TokenType.BANG_EQUAL]: (_, a, b) => a !== b
}
