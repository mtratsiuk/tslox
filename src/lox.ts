import * as fs from "fs"
import * as readline from "readline"

import { Scanner } from "./scanner"
import { Parser } from "./parser"
import { Interpreter, stringify, LoxValue } from "./interpreter"
import { AstPrinter } from "./ast-printer"
import { Token } from "./token"
import * as Stmt from "./stmt"

export function main(args: string[]): void {
  const filePath = args[2]

  if (!filePath) {
    return runPrompt()
  }

  runFile(filePath)
}

function runFile(filePath: string): void {
  fs.readFile(filePath, "utf8", (error, source) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }

    process.exit(run(source))
  })
}

function runPrompt(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ">"
  })

  const interpreter = new Interpreter()

  rl.prompt()

  rl.on("line", line => {
    run(line.trim(), { interpreter }, ({ result, statements }) => {
      console.log(statements)
      console.log(stringify(result))
    })

    rl.prompt()
  }).on("close", () => {
    process.exit(0)
  })
}

enum ExitCode {
  Ok = 0,
  FormatError = 65,
  RuntimeError = 70
}

function run(
  source: string,
  ctx: { interpreter?: Interpreter } = {},
  onSuccess?: (arg: {
    tokens: Token[]
    statements: Stmt.Stmt[]
    result: LoxValue
  }) => void
): ExitCode {
  return Scanner.scan(source).match({
    ok: tokens => {
      return Parser.parse(tokens).match({
        ok: statements => {
          return (ctx.interpreter || Interpreter).interpret(statements).match({
            ok: result => {
              if (onSuccess) {
                onSuccess({ tokens, statements, result })
              }
              return ExitCode.Ok
            },
            fail: error => {
              report(
                error.token.line,
                `at "${error.token.lexeme}"`,
                error.message
              )
              return ExitCode.RuntimeError
            }
          })
        },
        fail: errors => {
          errors.forEach(({ token, message }) =>
            report(token.line, `at "${token.lexeme}"`, message)
          )
          return ExitCode.FormatError
        }
      })
    },
    fail: errors => {
      errors.forEach(({ line, message }) => report(line, "", message))
      return ExitCode.FormatError
    }
  })
}

function report(line: number, where: string, message: string): void {
  console.error(`[line ${line}] Error ${where}: ${message}`)
}
