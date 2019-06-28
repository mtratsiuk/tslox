import * as Expr from "./expr"
import { notImplemented } from "./common"

export class RpnPrinter implements Expr.Visitor<string> {
  print(expr: Expr.Expr): string {
    return expr.accept(this)
  }

  visitBinaryExpr(expr: Expr.Binary): string {
    return `${expr.left.accept(this)} ${expr.right.accept(this)} ${
      expr.operator.lexeme
    }`
  }

  visitGroupingExpr(expr: Expr.Grouping): string {
    return expr.expression.accept(this)
  }

  visitLiteralExpr(expr: Expr.Literal): string {
    if (expr.value === null) {
      return "nil"
    }

    return expr.value.toString()
  }

  visitUnaryExpr = notImplemented
  visitTernaryExpr = notImplemented
  visitVariableExpr = notImplemented
  visitAssignExpr = notImplemented
}
