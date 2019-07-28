import { Environment } from "./environment"
import { Callable } from "./callable"

const globals = new Environment()

globals.define(
  "clock",
  new class extends Callable {
    getArity() {
      return 0
    }

    call() {
      return Date.now()
    }
  }()
)

export { globals }
