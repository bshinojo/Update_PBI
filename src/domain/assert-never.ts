// Garantiza exhaustividad en los `switch` sobre uniones discriminadas.
// Si se agrega un nuevo caso y algún switch no lo maneja, esto pasa a ser
// un error de compilación (el argumento dejaría de ser de tipo `never`).
export function assertNever(value: never): never {
  throw new Error(`Caso no manejado: ${JSON.stringify(value)}`)
}
