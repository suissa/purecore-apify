import i18next, { initReactI18next } from "i18next";

// Configurações de internacionalização
const resources = {
  "pt-BR": {
    translation: {
      // 4xx Erros do Cliente
      badRequest: "Requisição inválida",
      unauthorized: "Não autorizado",
      paymentRequired: "Pagamento obrigatório",
      forbidden: "Acesso proibido",
      notFound: "Recurso não encontrado",
      methodNotAllowed: "Método não permitido",
      notAcceptable: "Não aceitável",
      proxyAuthenticationRequired: "Autenticação de proxy obrigatória",
      requestTimeout: "Tempo limite da requisição excedido",
      conflict: "Conflito de dados",
      gone: "Recurso removido permanentemente",
      lengthRequired: "Comprimento obrigatório",
      preconditionFailed: "Pré-condição falhou",
      payloadTooLarge: "Carga útil muito grande",
      uriTooLong: "URI muito longa",
      unsupportedMediaType: "Tipo de mídia não suportado",
      rangeNotSatisfiable: "Faixa não satisfatória",
      expectationFailed: "Expectativa falhou",
      imateapot: "Eu sou um bule de chá",
      misdirectedRequest: "Requisição mal direcionada",
      unprocessableEntity: "Entidade não processável",
      locked: "Bloqueado",
      failedDependency: "Dependência falhou",
      tooEarly: "Muito cedo",
      upgradeRequired: "Atualização obrigatória",
      preconditionRequired: "Pré-condição obrigatória",
      tooManyRequests: "Muitas requisições",
      requestHeaderFieldsTooLarge:
        "Campos do cabeçalho da requisição muito grandes",
      unavailableForLegalReasons: "Indisponível por razões legais",

      // 5xx Erros do Servidor
      internalServerError: "Erro interno do servidor",
      notImplemented: "Funcionalidade não implementada",
      badGateway: "Gateway inválido",
      serviceUnavailable: "Serviço indisponível",
      gatewayTimeout: "Tempo limite do gateway excedido",
      httpVersionNotSupported: "Versão HTTP não suportada",
      variantAlsoNegotiates: "Variante também negocia",
      insufficientStorage: "Armazenamento insuficiente",
      loopDetected: "Loop detectado",
      bandwidthLimitExceeded: "Limite de largura de banda excedido",
      notExtended: "Não estendido",
      networkAuthenticationRequired: "Autenticação de rede obrigatória",
    },
  },
};

export const initI18n = async () => {
  await i18next.use(initReactI18next).init({
    lng: "pt-BR",
    fallbackLng: "pt-BR",
    resources,
    interpolation: {
      escapeValue: false,
    },
  });
};

export const t = (key: string): string => {
  return i18next.t(key);
};

export default i18next;
