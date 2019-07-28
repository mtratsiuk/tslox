// Generated code

import { Expr, Variable } from "./expr"
import { Token } from "./token"

export interface Visitor<T> {
  visitExpressionStmt(stmt: Expression): T
  visitPrintStmt(stmt: Print): T
  visitVarStmt(stmt: Var): T
  visitBlockStmt(stmt: Block): T
  visitIfStmt(stmt: If): T
  visitWhileStmt(stmt: While): T
  visitBreakStmt(stmt: Break): T
  visitFunctionStmt(stmt: Function): T
  visitReturnStmt(stmt: Return): T
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
  constructor(readonly variable: Variable, readonly initializer?: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitVarStmt(this)
  }
}

export class Block implements Stmt {
  constructor(readonly statements: Stmt[]) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitBlockStmt(this)
  }
}

export class If implements Stmt {
  constructor(
    readonly condition: Expr,
    readonly thenBranch: Stmt,
    readonly elseBranch?: Stmt
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitIfStmt(this)
  }
}

export class While implements Stmt {
  constructor(readonly condition: Expr, readonly body: Stmt) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitWhileStmt(this)
  }
}

export class Break implements Stmt {
  constructor() {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitBreakStmt(this)
  }
}

export class Function implements Stmt {
  constructor(
    readonly name: Token,
    readonly params: Token[],
    readonly body: Block
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitFunctionStmt(this)
  }
}

export class Return implements Stmt {
  constructor(readonly keyword: Token, readonly value?: Expr) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitReturnStmt(this)
  }
}
