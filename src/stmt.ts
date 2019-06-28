// Generated code

import { Expr } from "./expr"
import { Token } from "./token"

export interface Visitor<T> {
  visitExpressionStmt(stmt: Expression): T
  visitPrintStmt(stmt: Print): T
  visitVarStmt(stmt: Var): T
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

export class Var implements Stmt {
  constructor(readonly name: Token, readonly initializer?: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitVarStmt(this)
  }
}
