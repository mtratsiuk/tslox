// Generated code

import { Token, Literal as LiteralValue } from "./token"

export interface Visitor<T> {
  visitBinaryExpr(expr: Binary): T
  visitTernaryExpr(expr: Ternary): T
  visitGroupingExpr(expr: Grouping): T
  visitLiteralExpr(expr: Literal): T
  visitUnaryExpr(expr: Unary): T
}

export interface Expr {
  accept<T>(visitor: Visitor<T>): T
}

export class Binary implements Expr {
  constructor(
    readonly left: Expr,
    readonly operator: Token,
    readonly right: Expr
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitBinaryExpr(this)
  }
}

export class Ternary implements Expr {
  constructor(
    readonly condition: Expr,
    readonly left: Expr,
    readonly right: Expr
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitTernaryExpr(this)
  }
}

export class Grouping implements Expr {
  constructor(readonly expression: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitGroupingExpr(this)
  }
}

export class Literal implements Expr {
  constructor(readonly value: LiteralValue) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitLiteralExpr(this)
  }
}

export class Unary implements Expr {
  constructor(readonly operator: Token, readonly right: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitUnaryExpr(this)
  }
}
