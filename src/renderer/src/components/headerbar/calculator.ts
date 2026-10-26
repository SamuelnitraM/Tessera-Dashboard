/**
 * Calcul de la calculatrice de la barre des pages, sans `eval` : + − × ÷, puissance (^),
 * pourcentage (50% = 0,5), parenthèses, virgule ou point décimal.
 */

type Token = number | '+' | '-' | '*' | '/' | '^' | '%' | '(' | ')'

const OPERATORS: Record<string, Token> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  x: '*',
  '/': '/',
  '÷': '/',
  ':': '/',
  '^': '^',
  '%': '%',
  '(': '(',
  ')': ')'
}

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = []
  const text = expression.replace(/\s+/g, '').toLowerCase()
  let index = 0
  while (index < text.length) {
    const number = /^(\d+([.,]\d*)?|[.,]\d+)/.exec(text.slice(index))
    if (number) {
      tokens.push(Number(number[0].replace(',', '.')))
      index += number[0].length
      continue
    }
    const operator = OPERATORS[text[index]]
    if (!operator) return null
    tokens.push(operator)
    index += 1
  }
  return tokens
}

/** Résultat du calcul, ou `null` s'il est incomplet ou impossible (division par zéro…). */
export function evaluate(expression: string): number | null {
  const tokens = tokenize(expression)
  if (!tokens || tokens.length === 0) return null
  let position = 0
  const peek = (): Token | undefined => tokens[position]

  // somme = produit (('+' | '-') produit)*
  const sum = (): number => {
    let value = product()
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[position++]
      const right = product()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }
  // produit = signe (('*' | '/') signe)*
  const product = (): number => {
    let value = signed()
    while (peek() === '*' || peek() === '/') {
      const operator = tokens[position++]
      const right = signed()
      value = operator === '*' ? value * right : value / right
    }
    return value
  }
  // signe = ('+' | '-') signe | puissance
  const signed = (): number => {
    if (peek() === '-') {
      position++
      return -signed()
    }
    if (peek() === '+') {
      position++
      return signed()
    }
    return power()
  }
  // puissance = valeur ('^' signe)?
  const power = (): number => {
    const base = value()
    if (peek() !== '^') return base
    position++
    return base ** signed()
  }
  // valeur = (nombre | '(' somme ')') '%'?
  const value = (): number => {
    const token = tokens[position++]
    let result: number
    if (typeof token === 'number') result = token
    else if (token === '(') {
      result = sum()
      if (tokens[position++] !== ')') throw new Error('parenthèse')
    } else throw new Error('valeur')
    while (peek() === '%') {
      position++
      result /= 100
    }
    return result
  }

  try {
    const result = sum()
    if (position !== tokens.length || !Number.isFinite(result)) return null
    // 0,1 + 0,2 = 0,3 (et non 0,30000000000000004)
    return Number(result.toPrecision(12))
  } catch {
    return null
  }
}
