/**
 * Helmet.js - Implementação Nativa de Headers de Segurança HTTP
 * Baseado em https://github.com/helmetjs/helmet
 */

import { Request, Response, NextFunction, RequestHandler } from '../types';
import { createHandlerDecorator } from './base';

// =========================================
// CONTENT SECURITY POLICY (CSP)
// =========================================

interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'connect-src'?: string[];
  'font-src'?: string[];
  'object-src'?: string[];
  'media-src'?: string[];
  'frame-src'?: string[];
  'sandbox'?: string[];
  'report-uri'?: string;
  'child-src'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'plugin-types'?: string[];
  'base-uri'?: string[];
  'report-to'?: string;
  [key: string]: string[] | string | undefined;
}

interface CSPGuardOptions {
  directives?: CSPDirectives;
  reportOnly?: boolean;
}

/**
 * Content Security Policy - Controla recursos que o navegador pode carregar
 */
export const CSPGuard = (options: CSPGuardOptions = {}): MethodDecorator => {
  const defaultDirectives: CSPDirectives = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'font-src': ["'self'", 'https:', 'data:'],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'object-src': ["'none'"],
    'script-src': ["'self'"],
    'script-src-attr': ["'none'"],
    'style-src': ["'self'", 'https:', "'unsafe-inline'"],
    'upgrade-insecure-requests': [],
  };

  const directives = { ...defaultDirectives, ...options.directives };
  const headerName = options.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      const cspValue = Object.entries(directives)
        .filter(([, value]) => value !== undefined)
        .map(([directive, sources]) => {
          if (Array.isArray(sources)) {
            return sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive;
          }
          return `${directive} ${sources}`;
        })
        .join('; ');

      res.setHeader(headerName, cspValue);
      return handler(req, res, next);
    };

    return execute;
  });
};

// =========================================
// CROSS-ORIGIN POLICIES
// =========================================

/**
 * Cross-Origin Embedder Policy - Previne carregamento de recursos cross-origin
 */
export const COEPGuard = (options: { policy?: 'require-corp' | 'credentialless' } = {}): MethodDecorator => {
  const policy = options.policy ?? 'require-corp';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', policy);
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * Cross-Origin Opener Policy - Isola janelas de origem cruzada
 */
export const COOPGuard = (options: { policy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' } = {}): MethodDecorator => {
  const policy = options.policy ?? 'same-origin';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', policy);
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * Cross-Origin Resource Policy - Controla compartilhamento de recursos cross-origin
 */
export const CORPGuard = (options: { policy?: 'same-origin' | 'same-site' | 'cross-origin' } = {}): MethodDecorator => {
  const policy = options.policy ?? 'same-origin';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', policy);
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * Origin-Agent-Cluster - Melhora isolamento de processos
 */
export const OriginAgentClusterGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('Origin-Agent-Cluster', '?1');
      return handler(req, res, next);
    };

    return execute;
  });
};

// =========================================
// REFERRER POLICY
// =========================================

interface ReferrerPolicyOptions {
  policy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' |
           'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
}

/**
 * Referrer Policy - Controla envio de referrer
 */
export const ReferrerPolicyGuard = (options: ReferrerPolicyOptions = {}): MethodDecorator => {
  const policy = options.policy ?? 'no-referrer';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('Referrer-Policy', policy);
      return handler(req, res, next);
    };

    return execute;
  });
};

// =========================================
// STRICT TRANSPORT SECURITY (HSTS)
// =========================================

interface HSTSOptions {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

/**
 * Strict Transport Security - Força HTTPS
 */
export const HSTSGuard = (options: HSTSOptions = {}): MethodDecorator => {
  const maxAge = Math.floor(options.maxAge ?? 31536000); // 1 ano por padrão
  const includeSubDomains = options.includeSubDomains ?? true;
  const preload = options.preload ?? false;

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      let hstsValue = `max-age=${maxAge}`;
      if (includeSubDomains) hstsValue += '; includeSubDomains';
      if (preload) hstsValue += '; preload';

      res.setHeader('Strict-Transport-Security', hstsValue);
      return handler(req, res, next);
    };

    return execute;
  });
};

// =========================================
// X-HEADERS LEGACY
// =========================================

/**
 * X-Content-Type-Options - Previne MIME sniffing
 */
export const XContentTypeOptionsGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * X-DNS-Prefetch-Control - Controla DNS prefetching
 */
export const XDNSPrefetchControlGuard = (options: { allow?: boolean } = {}): MethodDecorator => {
  const allow = options.allow ?? false;

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('X-DNS-Prefetch-Control', allow ? 'on' : 'off');
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * X-Download-Options - Protege contra downloads maliciosos (IE8)
 */
export const XDownloadOptionsGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('X-Download-Options', 'noopen');
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * X-Frame-Options - Previne clickjacking
 */
export const XFrameOptionsGuard = (options: { action?: 'DENY' | 'SAMEORIGIN' } = {}): MethodDecorator => {
  const action = options.action ?? 'SAMEORIGIN';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('X-Frame-Options', action);
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * X-Permitted-Cross-Domain-Policies - Controla políticas cross-domain
 */
export const XPermittedCrossDomainPoliciesGuard = (options: {
  permittedPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all'
} = {}): MethodDecorator => {
  const permittedPolicies = options.permittedPolicies ?? 'none';

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('X-Permitted-Cross-Domain-Policies', permittedPolicies);
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * X-Powered-By - Remove header X-Powered-By
 */
export const XPoweredByGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.removeHeader('X-Powered-By');
      return handler(req, res, next);
    };

    return execute;
  });
};

/**
 * X-XSS-Protection - Desabilita filtro XSS do navegador
 */
export const XXSSProtectionGuard = (): MethodDecorator => {
  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      res.setHeader('X-XSS-Protection', '0');
      return handler(req, res, next);
    };

    return execute;
  });
};

// =========================================
// HELMET GUARD COMPLETO
// =========================================

interface HelmetOptions {
  contentSecurityPolicy?: CSPGuardOptions | false;
  crossOriginEmbedderPolicy?: { policy?: 'require-corp' | 'credentialless' } | false;
  crossOriginOpenerPolicy?: { policy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' } | false;
  crossOriginResourcePolicy?: { policy?: 'same-origin' | 'same-site' | 'cross-origin' } | false;
  originAgentCluster?: boolean;
  referrerPolicy?: ReferrerPolicyOptions | false;
  strictTransportSecurity?: HSTSOptions | false;
  xContentTypeOptions?: boolean;
  xDnsPrefetchControl?: { allow?: boolean } | false;
  xDownloadOptions?: boolean;
  xFrameOptions?: { action?: 'DENY' | 'SAMEORIGIN' } | false;
  xPermittedCrossDomainPolicies?: { permittedPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all' } | false;
  xPoweredBy?: boolean;
  xXssProtection?: boolean;
}

/**
 * Helmet Guard - Combinação completa de todos os headers de segurança HTTP
 * Similar ao helmet() do Helmet.js
 */
export const HelmetGuard = (options: HelmetOptions = {}): MethodDecorator => {
  // Configurações padrão (habilitadas por padrão)
  const config = {
    contentSecurityPolicy: options.contentSecurityPolicy !== false ? (options.contentSecurityPolicy || {}) : false,
    crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy !== false ? (options.crossOriginEmbedderPolicy || {}) : false,
    crossOriginOpenerPolicy: options.crossOriginOpenerPolicy !== false ? (options.crossOriginOpenerPolicy || {}) : false,
    crossOriginResourcePolicy: options.crossOriginResourcePolicy !== false ? (options.crossOriginResourcePolicy || {}) : false,
    originAgentCluster: options.originAgentCluster ?? false,
    referrerPolicy: options.referrerPolicy !== false ? (options.referrerPolicy || {}) : false,
    strictTransportSecurity: options.strictTransportSecurity !== false ? (options.strictTransportSecurity || {}) : false,
    xContentTypeOptions: options.xContentTypeOptions ?? true,
    xDnsPrefetchControl: options.xDnsPrefetchControl !== false ? (options.xDnsPrefetchControl || {}) : false,
    xDownloadOptions: options.xDownloadOptions ?? true,
    xFrameOptions: options.xFrameOptions !== false ? (options.xFrameOptions || {}) : false,
    xPermittedCrossDomainPolicies: options.xPermittedCrossDomainPolicies !== false ? (options.xPermittedCrossDomainPolicies || {}) : false,
    xPoweredBy: options.xPoweredBy ?? true,
    xXssProtection: options.xXssProtection ?? true,
  };

  return createHandlerDecorator((handler) => {
    const execute: RequestHandler = async (req, res, next) => {
      try {
        // Aplica todos os headers de segurança diretamente

        // Content Security Policy
        if (config.contentSecurityPolicy !== false) {
          const cspOptions = config.contentSecurityPolicy;
          const defaultDirectives: CSPDirectives = {
            'default-src': ["'self'"],
            'base-uri': ["'self'"],
            'font-src': ["'self'", 'https:', 'data:'],
            'form-action': ["'self'"],
            'frame-ancestors': ["'self'"],
            'img-src': ["'self'", 'data:', 'https:'],
            'object-src': ["'none'"],
            'script-src': ["'self'"],
            'script-src-attr': ["'none'"],
            'style-src': ["'self'", 'https:', "'unsafe-inline'"],
            'upgrade-insecure-requests': [],
          };

          const directives = { ...defaultDirectives, ...(cspOptions.directives || {}) };
          const headerName = cspOptions.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

          const cspValue = Object.entries(directives)
            .filter(([, value]) => value !== undefined)
            .map(([directive, sources]) => {
              if (Array.isArray(sources)) {
                return sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive;
              }
              return `${directive} ${sources}`;
            })
            .join('; ');

          res.setHeader(headerName, cspValue);
        }

        // Cross-Origin Embedder Policy
        if (config.crossOriginEmbedderPolicy !== false) {
          const policy = config.crossOriginEmbedderPolicy.policy ?? 'require-corp';
          res.setHeader('Cross-Origin-Embedder-Policy', policy);
        }

        // Cross-Origin Opener Policy
        if (config.crossOriginOpenerPolicy !== false) {
          const policy = config.crossOriginOpenerPolicy.policy ?? 'same-origin';
          res.setHeader('Cross-Origin-Opener-Policy', policy);
        }

        // Cross-Origin Resource Policy
        if (config.crossOriginResourcePolicy !== false) {
          const policy = config.crossOriginResourcePolicy.policy ?? 'same-origin';
          res.setHeader('Cross-Origin-Resource-Policy', policy);
        }

        // Origin-Agent-Cluster
        if (config.originAgentCluster) {
          res.setHeader('Origin-Agent-Cluster', '?1');
        }

        // Referrer Policy
        if (config.referrerPolicy !== false) {
          const policy = config.referrerPolicy.policy ?? 'no-referrer';
          res.setHeader('Referrer-Policy', policy);
        }

        // Strict Transport Security (HSTS)
        if (config.strictTransportSecurity !== false) {
          const hstsOptions = config.strictTransportSecurity;
          const maxAge = Math.floor(hstsOptions.maxAge ?? 31536000);
          const includeSubDomains = hstsOptions.includeSubDomains ?? true;
          const preload = hstsOptions.preload ?? false;

          let hstsValue = `max-age=${maxAge}`;
          if (includeSubDomains) hstsValue += '; includeSubDomains';
          if (preload) hstsValue += '; preload';

          res.setHeader('Strict-Transport-Security', hstsValue);
        }

        // X-Content-Type-Options
        if (config.xContentTypeOptions) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }

        // X-DNS-Prefetch-Control
        if (config.xDnsPrefetchControl !== false) {
          const allow = config.xDnsPrefetchControl.allow ?? false;
          res.setHeader('X-DNS-Prefetch-Control', allow ? 'on' : 'off');
        }

        // X-Download-Options
        if (config.xDownloadOptions) {
          res.setHeader('X-Download-Options', 'noopen');
        }

        // X-Frame-Options
        if (config.xFrameOptions !== false) {
          const action = config.xFrameOptions.action ?? 'SAMEORIGIN';
          res.setHeader('X-Frame-Options', action);
        }

        // X-Permitted-Cross-Domain-Policies
        if (config.xPermittedCrossDomainPolicies !== false) {
          const permittedPolicies = config.xPermittedCrossDomainPolicies.permittedPolicies ?? 'none';
          res.setHeader('X-Permitted-Cross-Domain-Policies', permittedPolicies);
        }

        // X-Powered-By (remoção)
        if (config.xPoweredBy) {
          res.removeHeader('X-Powered-By');
        }

        // X-XSS-Protection
        if (config.xXssProtection) {
          res.setHeader('X-XSS-Protection', '0');
        }

        // Executa o handler original
        return handler(req, res, next);

      } catch (error) {
        return next(error);
      }
    };

    return execute;
  });
};

// Função helper para uso como middleware
let target: any = {};
let propertyKey: string | symbol = Symbol('helmet');

/**
 * Middleware helper para aplicar Helmet headers
 */
export const helmet = (options?: HelmetOptions): RequestHandler => {
  const helmetDecorator = HelmetGuard(options);
  const descriptor = helmetDecorator(target, propertyKey, {
    value: async (req: Request, res: Response, next: NextFunction) => {
      next();
    }
  });

  return descriptor.value;
};
