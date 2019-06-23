import * as fs from 'fs'

main(process.argv)

function main(args: string[]): void {
  fs.writeFile(args[2], defineAst(), error => {
    if (error) {
      console.log(error)
      process.exit(1)
    }
  })
}

function defineAst (): string {
  enum Types {
    Expr = 'Expr',
    Token = 'Token',
    Literal = 'LiteralValue',
  }

  const nodesDef: Array<[string, ...Array<[Types, string]>]> = [
    ['Binary', [Types.Expr, 'left'], [Types.Token, 'operator'], [Types.Expr, 'right']],
    ['Grouping', [Types.Expr, 'expression']],
    ['Literal', [Types.Literal, 'value']],
    ['Unary', [Types.Token, 'operator'], [Types.Expr, 'right']]
  ]

  const expr = `\
export interface ${Types.Expr} {
  accept<T>(visitor: Visitor<T>): T
}
`

  const visitor = `\
export interface Visitor<T> {
  ${nodesDef.map(([name]) => `visit${name}${Types.Expr}(expr: ${name}): T`).join('\n')}
}
`

  const nodes = nodesDef.map(([name, ...args]) => `\
export class ${name} implements ${Types.Expr} {
  constructor(
    ${args.map(([type, name]) => `readonly ${name}: ${type}`).join(', \n')}
  ) {}

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visit${name}${Types.Expr}(this)
  }
}
`).join('\n')

  return `\
// Generated code

import { Token, Literal as LiteralValue } from "./token"

${visitor}

${expr}

${nodes}
`
}
