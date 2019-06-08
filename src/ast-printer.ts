import * as Expr from "./expr"

export class AstPrinter implements Expr.Visitor<string> {
  print(expr: Expr.Expr): string {
    return expr.accept(this)
  }

  private parenthesize(name: string, ...exprs: Array<Expr.Expr>): string {
    return exprs.reduce((str, expr) => str + " " + expr.accept(this), "(" + name) + ')'
  }

  visitBinaryExpr(expr: Expr.Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitGroupingExpr(expr: Expr.Grouping): string {
    return this.parenthesize('group', expr.expression)
  }

  visitLiteralExpr(expr: Expr.Literal): string {
    if (expr.value === null) {
      return 'nil'
    }

    return expr.value.toString()
  }

  visitUnaryExpr(expr: Expr.Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right)
  }
}
