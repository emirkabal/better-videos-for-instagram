export function idToPk(shortcode: string) {
  if (shortcode.length > 28) {
    shortcode = shortcode.slice(0, -28)
  }

  const ENCODING_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

  return decodeBaseN(shortcode, ENCODING_CHARS).toString()
}

function decodeBaseN(str: string, chars: string) {
  const base = BigInt(chars.length)
  let result = BigInt(0)

  for (let i = 0; i < str.length; i++) {
    const charValue = chars.indexOf(str.charAt(i))
    if (charValue === -1) {
      throw new Error(`Invalid character in shortcode: ${str[i]}`)
    }
    result = result * base + BigInt(charValue)
  }

  return result
}
