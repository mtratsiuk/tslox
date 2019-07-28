// Generated code

import { Token, Literal as LiteralValue } from "./token"

export interface Visitor<T> {
  visitBinaryExpr(expr: Binary): T
  visitLogicalExpr(expr: Logical): T
  visitTernaryExpr(expr: Ternary): T
  visitGroupingExpr(expr: Grouping): T
  visitLiteralExpr(expr: Literal): T
  visitUnaryExpr(expr: Unary): T
  visitVariableExpr(expr: Variable): T
  visitAssignExpr(expr: Assign): T
  visitCallExpr(expr: Call): T
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

export class Logical implements Expr {
  constructor(
    readonly left: Expr,
    readonly operator: Token,
    readonly right: Expr
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitLogicalExpr(this)
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

export class Variable implements Expr {
  constructor(readonly name: Token) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitVariableExpr(this)
  }
}

export class Assign implements Expr {
  constructor(readonly variable: Variable, readonly value: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitAssignExpr(this)
  }
}

export class Call implements Expr {
  constructor(
    readonly callee: Expr,
    readonly paren: Token,
    readonly args: Expr[]
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitCallExpr(this)
  }
}
