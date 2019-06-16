import { Token } from './token'
import { TokenType } from './token-type'
import * as Expr from './expr'

export class Parser {
    private tokens: Array<Token>
    private current: number = 0

    constructor(tokens: Array<Token>) {
        if (tokens.length === 0) {
            throw new Error('Expected non-empty array of tokens')
        }

        this.tokens = tokens
    }

    static parse(tokens: Array<Token>): Expr.Expr {
        return new Parser(tokens).parse()
    }

    parse(): Expr.Expr {
        return this.expression()
    }

    private binary = (operation: () => Expr.Expr, ...types: Array<TokenType>) => () => {
        let expr = operation()

        while (this.match(...types)) {
            const op = this.previous()
            const right = operation()

            expr = new Expr.Binary(expr, op, right)
        }

        return expr
    }

    private primary(): Expr.Expr {
        if (this.match(TokenType.FALSE)) return new Expr.Literal(false)
        if (this.match(TokenType.TRUE)) return new Expr.Literal(true)
        if (this.match(TokenType.NIL)) return new Expr.Literal(null)

        if (this.match(TokenType.NUMBER, TokenType.STRING)) {
            return new Expr.Literal(this.previous().literal)
        }

        this.consume(TokenType.LEFT_PAREN, 'Unexpected token')
        const expr = this.expression()
        this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after expression')

        return new Expr.Grouping(expr)
    }

    private unary: () => Expr.Expr = () => {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            return new Expr.Unary(this.previous(), this.unary())
        }

        return this.primary()
    }

    private multiplication = this.binary(
        this.unary,
        TokenType.SLASH,
        TokenType.STAR
    )

    private addition = this.binary(
        this.multiplication,
        TokenType.PLUS,
        TokenType.MINUS,
    )

    private comparison = this.binary(
        this.addition,
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL
    )

    private equality = this.binary(
        this.comparison,
        TokenType.BANG_EQUAL,
        TokenType.EQUAL_EQUAL
    )

    private expression(): Expr.Expr {
        return this.equality()
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) {
            return this.advance()
        }

        throw new Error(message)
    }

    private match(...types: Array<TokenType>): boolean {
        for (let type of types) {
            if (this.check(type)) {
                this.advance()
                return true
            }
        }

        return false
    }

    private check(type: TokenType): boolean {
        return !this.isAtEnd()
            && this.peek().type === type
    }

    private advance(): Token {
        if (!this.isAtEnd()) {
            this.current += 1
        }

        return this.previous()
    }

    private peek(): Token {
        return this.tokens[this.current]
    }

    private previous(): Token {
        return this.tokens[this.current - 1]
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF
    }
}