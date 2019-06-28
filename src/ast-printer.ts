import * as Expr from "./expr"
import * as Stmt from "./stmt"

export class AstPrinter implements Expr.Visitor<string>, Stmt.Visitor<string> {
  static print(statements: Stmt.Stmt[]): string {
    const printer = new AstPrinter()

    return statements.map(s => printer.printStatement(s)).join("\n")
  }

  printStatement(stmt: Stmt.Stmt): string {
    return stmt.accept(this)
  }

  printExpression(expr: Expr.Expr): string {
    return expr.accept(this)
  }

  private depth = -1

  private parenthesize(name: string, ...exprs: Expr.Expr[]): string {
    this.depth += 1
    try {
      return (
        exprs.reduce(
          (str, expr) => str + " " + expr.accept(this),
          "\n" + " ".repeat(this.depth * 2) + "(" + name
        ) + ")"
      )
    } finally {
      this.depth -= 1
    }
  }

  visitExpressionStmt(stmt: Stmt.Expression): string {
    return this.printExpression(stmt.expression)
  }

  visitPrintStmt(stmt: Stmt.Print): string {
    return this.parenthesize("print", stmt.expression)
  }

  visitVarStmt(stmt: Stmt.Var): string {
    const exprs: Expr.Expr[] = [stmt.variable]

    if (stmt.initializer) {
      exprs.push(stmt.initializer)
    }

    return this.parenthesize("define", ...exprs)
  }

  visitBinaryExpr(expr: Expr.Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right)
  }

  visitTernaryExpr(expr: Expr.Ternary): string {
    return this.parenthesize("if", expr.condition, expr.left, expr.right)
  }

  visitGroupingExpr(expr: Expr.Grouping): string {
    return this.parenthesize("group", expr.expression)
  }

  visitLiteralExpr(expr: Expr.Literal): string {
    if (expr.value === null) {
      return "nil"
    }

    if (typeof expr.value === "string") {
      return `"${expr.value}"`
    }

    return expr.value.toString()
  }

  visitUnaryExpr(expr: Expr.Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right)
  }

  visitVariableExpr(expr: Expr.Variable): string {
    return expr.name.lexeme
  }

  visitAssignExpr(expr: Expr.Assign): string {
    return this.parenthesize("set", expr.variable, expr.value)
  }
}
