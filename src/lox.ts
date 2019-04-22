import * as fs from "fs"
import * as readline from "readline"

import { Scanner } from "./scanner"

let hadError = false

export function main(args: Array<string>): void {
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

    run(source)

    if (hadError) {
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

    hadError = false

    rl.prompt()
  }).on("close", () => {
    process.exit(0)
  })
}

function run(source: string): void {
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()

  console.log(tokens.join("\n"))
}

export function error(line: number, message: string) {
  report(line, "", message)
}

function report(line: number, where: string, message: string): void {
  console.error(`[line ${line}] Error ${where}: ${message}`)
}
