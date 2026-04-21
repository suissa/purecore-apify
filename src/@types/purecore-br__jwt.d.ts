declare module "@purecore-br/jwt" {
  // O pacote pode não expor tipos compatíveis com `moduleResolution: bundler`.
  // Mantemos o runtime import intacto e fornecemos tipagem mínima para o TS.
  export const SignJWT: any;
}

