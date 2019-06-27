// Generated code

import { Expr } from "./expr"

export interface Visitor<T> {
  visitExpressionStmt(expr: Expression): T
  visitPrintStmt(expr: Print): T
}

export interface Stmt {
  accept<T>(visitor: Visitor<T>): T
}

export class Expression implements Stmt {
  constructor(readonly expression: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitExpressionStmt(this)
  }
}

export class Print implements Stmt {
  constructor(readonly expression: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitPrintStmt(this)
  }
}
