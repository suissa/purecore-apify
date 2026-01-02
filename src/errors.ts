import { t } from "./i18n.js";

/**
 * Classes de erro específicas para @purecore/apify
 * Cada erro inclui o status code HTTP apropriado
 * Suporte completo a i18n com pt-BR
 */

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }
}

// --- 4xx Erros do Cliente ---

export class BadRequestError extends HttpError {
  constructor(message?: string) {
    super(message || t("badRequest"), 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message?: string) {
    super(message || t("unauthorized"), 401);
  }
}

export class PaymentRequiredError extends HttpError {
  constructor(message?: string) {
    super(message || t("paymentRequired"), 402);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    super(message || t("forbidden"), 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message?: string) {
    super(message || t("notFound"), 404);
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message?: string) {
    super(message || t("methodNotAllowed"), 405);
  }
}

export class NotAcceptableError extends HttpError {
  constructor(message?: string) {
    super(message || t("notAcceptable"), 406);
  }
}

export class ProxyAuthenticationRequiredError extends HttpError {
  constructor(message?: string) {
    super(message || t("proxyAuthenticationRequired"), 407);
  }
}

export class RequestTimeoutError extends HttpError {
  constructor(message?: string) {
    super(message || t("requestTimeout"), 408);
  }
}

export class ConflictError extends HttpError {
  constructor(message?: string) {
    super(message || t("conflict"), 409);
  }
}

export class GoneError extends HttpError {
  constructor(message?: string) {
    super(message || t("gone"), 410);
  }
}

export class LengthRequiredError extends HttpError {
  constructor(message?: string) {
    super(message || t("lengthRequired"), 411);
  }
}

export class PreconditionFailedError extends HttpError {
  constructor(message?: string) {
    super(message || t("preconditionFailed"), 412);
  }
}

export class PayloadTooLargeError extends HttpError {
  constructor(message?: string) {
    super(message || t("payloadTooLarge"), 413);
  }
}

export class UriTooLongError extends HttpError {
  constructor(message?: string) {
    super(message || t("uriTooLong"), 414);
  }
}

export class UnsupportedMediaTypeError extends HttpError {
  constructor(message?: string) {
    super(message || t("unsupportedMediaType"), 415);
  }
}

export class RangeNotSatisfiableError extends HttpError {
  constructor(message?: string) {
    super(message || t("rangeNotSatisfiable"), 416);
  }
}

export class ExpectationFailedError extends HttpError {
  constructor(message?: string) {
    super(message || t("expectationFailed"), 417);
  }
}

export class ImATeapotError extends HttpError {
  constructor(message?: string) {
    super(message || t("imateapot"), 418);
  }
}

export class MisdirectedRequestError extends HttpError {
  constructor(message?: string) {
    super(message || t("misdirectedRequest"), 421);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message?: string) {
    super(message || t("unprocessableEntity"), 422);
  }
}

export class LockedError extends HttpError {
  constructor(message?: string) {
    super(message || t("locked"), 423);
  }
}

export class FailedDependencyError extends HttpError {
  constructor(message?: string) {
    super(message || t("failedDependency"), 424);
  }
}

export class TooEarlyError extends HttpError {
  constructor(message?: string) {
    super(message || t("tooEarly"), 425);
  }
}

export class UpgradeRequiredError extends HttpError {
  constructor(message?: string) {
    super(message || t("upgradeRequired"), 426);
  }
}

export class PreconditionRequiredError extends HttpError {
  constructor(message?: string) {
    super(message || t("preconditionRequired"), 428);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message?: string) {
    super(message || t("tooManyRequests"), 429);
  }
}

export class RequestHeaderFieldsTooLargeError extends HttpError {
  constructor(message?: string) {
    super(message || t("requestHeaderFieldsTooLarge"), 431);
  }
}

export class UnavailableForLegalReasonsError extends HttpError {
  constructor(message?: string) {
    super(message || t("unavailableForLegalReasons"), 451);
  }
}

// --- 5xx Erros do Servidor ---

export class InternalServerError extends HttpError {
  constructor(message?: string) {
    super(message || t("internalServerError"), 500);
  }
}

export class NotImplementedError extends HttpError {
  constructor(message?: string) {
    super(message || t("notImplemented"), 501);
  }
}

export class BadGatewayError extends HttpError {
  constructor(message?: string) {
    super(message || t("badGateway"), 502);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message?: string) {
    super(message || t("serviceUnavailable"), 503);
  }
}

export class GatewayTimeoutError extends HttpError {
  constructor(message?: string) {
    super(message || t("gatewayTimeout"), 504);
  }
}

export class HttpVersionNotSupportedError extends HttpError {
  constructor(message?: string) {
    super(message || t("httpVersionNotSupported"), 505);
  }
}

export class VariantAlsoNegotiatesError extends HttpError {
  constructor(message?: string) {
    super(message || t("variantAlsoNegotiates"), 506);
  }
}

export class InsufficientStorageError extends HttpError {
  constructor(message?: string) {
    super(message || t("insufficientStorage"), 507);
  }
}

export class LoopDetectedError extends HttpError {
  constructor(message?: string) {
    super(message || t("loopDetected"), 508);
  }
}

export class BandwidthLimitExceededError extends HttpError {
  constructor(message?: string) {
    super(message || t("bandwidthLimitExceeded"), 509);
  }
}

export class NotExtendedError extends HttpError {
  constructor(message?: string) {
    super(message || t("notExtended"), 510);
  }
}

export class NetworkAuthenticationRequiredError extends HttpError {
  constructor(message?: string) {
    super(message || t("networkAuthenticationRequired"), 511);
  }
}

// --- Erros de Validação ---

export class ValidationError extends BadRequestError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message?: string, field?: string, value?: any) {
    super(message);
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends UnauthorizedError {
  constructor(message?: string) {
    super(message);
  }
}

export class AuthorizationError extends ForbiddenError {
  constructor(message?: string) {
    super(message);
  }
}

// --- Erros de Database/API ---

export class DatabaseError extends InternalServerError {
  public readonly originalError?: Error;

  constructor(message?: string, originalError?: Error) {
    super(message);
    this.originalError = originalError;
  }
}

export class ExternalApiError extends BadGatewayError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message?: string, originalError?: Error) {
    super(message);
    this.service = service;
    this.originalError = originalError;
  }
}

// --- Função helper para identificar erros HTTP ---
export function isHttpError(error: any): error is HttpError {
  return error instanceof HttpError;
}

// --- Função helper simples para criar erro a partir de status code ---
export function httpError(statusCode: number, message?: string): HttpError {
  return createHttpErrorFromStatus(statusCode, message);
}

// --- Função helper para criar erro a partir de status code ---
export function createHttpErrorFromStatus(
  statusCode: number,
  message?: string
): HttpError {
  const errorMessage = message;

  switch (statusCode) {
    case 400:
      return new BadRequestError(errorMessage);
    case 401:
      return new UnauthorizedError(errorMessage);
    case 402:
      return new PaymentRequiredError(errorMessage);
    case 403:
      return new ForbiddenError(errorMessage);
    case 404:
      return new NotFoundError(errorMessage);
    case 405:
      return new MethodNotAllowedError(errorMessage);
    case 406:
      return new NotAcceptableError(errorMessage);
    case 407:
      return new ProxyAuthenticationRequiredError(errorMessage);
    case 408:
      return new RequestTimeoutError(errorMessage);
    case 409:
      return new ConflictError(errorMessage);
    case 410:
      return new GoneError(errorMessage);
    case 411:
      return new LengthRequiredError(errorMessage);
    case 412:
      return new PreconditionFailedError(errorMessage);
    case 413:
      return new PayloadTooLargeError(errorMessage);
    case 414:
      return new UriTooLongError(errorMessage);
    case 415:
      return new UnsupportedMediaTypeError(errorMessage);
    case 416:
      return new RangeNotSatisfiableError(errorMessage);
    case 417:
      return new ExpectationFailedError(errorMessage);
    case 418:
      return new ImATeapotError(errorMessage);
    case 421:
      return new MisdirectedRequestError(errorMessage);
    case 422:
      return new UnprocessableEntityError(errorMessage);
    case 423:
      return new LockedError(errorMessage);
    case 424:
      return new FailedDependencyError(errorMessage);
    case 425:
      return new TooEarlyError(errorMessage);
    case 426:
      return new UpgradeRequiredError(errorMessage);
    case 428:
      return new PreconditionRequiredError(errorMessage);
    case 429:
      return new TooManyRequestsError(errorMessage);
    case 431:
      return new RequestHeaderFieldsTooLargeError(errorMessage);
    case 451:
      return new UnavailableForLegalReasonsError(errorMessage);
    case 500:
      return new InternalServerError(errorMessage);
    case 501:
      return new NotImplementedError(errorMessage);
    case 502:
      return new BadGatewayError(errorMessage);
    case 503:
      return new ServiceUnavailableError(errorMessage);
    case 504:
      return new GatewayTimeoutError(errorMessage);
    case 505:
      return new HttpVersionNotSupportedError(errorMessage);
    case 506:
      return new VariantAlsoNegotiatesError(errorMessage);
    case 507:
      return new InsufficientStorageError(errorMessage);
    case 508:
      return new LoopDetectedError(errorMessage);
    case 509:
      return new BandwidthLimitExceededError(errorMessage);
    case 510:
      return new NotExtendedError(errorMessage);
    case 511:
      return new NetworkAuthenticationRequiredError(errorMessage);
    default:
      return new HttpError(
        errorMessage || `Erro HTTP ${statusCode}`,
        statusCode
      );
  }
}

// --- Objeto compatível com fastify.httpErrors ---
export const httpErrors = {
  badRequest: (message?: string) => new BadRequestError(message),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  paymentRequired: (message?: string) => new PaymentRequiredError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  notFound: (message?: string) => new NotFoundError(message),
  methodNotAllowed: (message?: string) => new MethodNotAllowedError(message),
  notAcceptable: (message?: string) => new NotAcceptableError(message),
  proxyAuthenticationRequired: (message?: string) =>
    new ProxyAuthenticationRequiredError(message),
  requestTimeout: (message?: string) => new RequestTimeoutError(message),
  conflict: (message?: string) => new ConflictError(message),
  gone: (message?: string) => new GoneError(message),
  lengthRequired: (message?: string) => new LengthRequiredError(message),
  preconditionFailed: (message?: string) =>
    new PreconditionFailedError(message),
  payloadTooLarge: (message?: string) => new PayloadTooLargeError(message),
  uriTooLong: (message?: string) => new UriTooLongError(message),
  unsupportedMediaType: (message?: string) =>
    new UnsupportedMediaTypeError(message),
  rangeNotSatisfiable: (message?: string) =>
    new RangeNotSatisfiableError(message),
  expectationFailed: (message?: string) => new ExpectationFailedError(message),
  imateapot: (message?: string) => new ImATeapotError(message),
  misdirectedRequest: (message?: string) =>
    new MisdirectedRequestError(message),
  unprocessableEntity: (message?: string) =>
    new UnprocessableEntityError(message),
  locked: (message?: string) => new LockedError(message),
  failedDependency: (message?: string) => new FailedDependencyError(message),
  tooEarly: (message?: string) => new TooEarlyError(message),
  upgradeRequired: (message?: string) => new UpgradeRequiredError(message),
  preconditionRequired: (message?: string) =>
    new PreconditionRequiredError(message),
  tooManyRequests: (message?: string) => new TooManyRequestsError(message),
  requestHeaderFieldsTooLarge: (message?: string) =>
    new RequestHeaderFieldsTooLargeError(message),
  unavailableForLegalReasons: (message?: string) =>
    new UnavailableForLegalReasonsError(message),
  internalServerError: (message?: string) => new InternalServerError(message),
  notImplemented: (message?: string) => new NotImplementedError(message),
  badGateway: (message?: string) => new BadGatewayError(message),
  serviceUnavailable: (message?: string) =>
    new ServiceUnavailableError(message),
  gatewayTimeout: (message?: string) => new GatewayTimeoutError(message),
  httpVersionNotSupported: (message?: string) =>
    new HttpVersionNotSupportedError(message),
  variantAlsoNegotiates: (message?: string) =>
    new VariantAlsoNegotiatesError(message),
  insufficientStorage: (message?: string) =>
    new InsufficientStorageError(message),
  loopDetected: (message?: string) => new LoopDetectedError(message),
  bandwidthLimitExceeded: (message?: string) =>
    new BandwidthLimitExceededError(message),
  notExtended: (message?: string) => new NotExtendedError(message),
  networkAuthenticationRequired: (message?: string) =>
    new NetworkAuthenticationRequiredError(message),
};
