import * as fs from "fs"
import * as readline from "readline"

import { Scanner } from "./scanner"
import { Parser } from "./parser"
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

    if (!run(source)) {
      process.exit(65)
    }
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

function run(source: string): boolean {
  return Scanner.scan(source).match({
    ok: tokens => {
      return Parser.parse(tokens).match({
        ok: expr => {
          console.log(expr)
          console.log(AstPrinter.print(expr))
          return true
        },
        fail: errors => {
          errors.forEach(({ token, message }) =>
            report(token.line, `at "${token.lexeme}"`, message)
          )
          return false
        }
      })
    },
    fail: errors => {
      errors.forEach(({ line, message }) => report(line, "", message))
      return false
    }
  })
}

function report(line: number, where: string, message: string): void {
  console.error(`[line ${line}] Error ${where}: ${message}`)
}
