import * as fs from "fs"
import * as readline from "readline"

import { Scanner } from "./scanner"
import { Parser } from "./parser"
import { Interpreter, stringify } from "./interpreter"
import { AstPrinter } from "./ast-printer"

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

  rl.prompt()

  rl.on("line", line => {
    run(line.trim())

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

function run(source: string): ExitCode {
  return Scanner.scan(source).match({
    ok: tokens => {
      return Parser.parse(tokens).match({
        ok: expr => {
          console.log(expr)
          console.log(AstPrinter.print(expr))

          return Interpreter.interpret(expr).match({
            ok: result => {
              console.log(stringify(result))
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
