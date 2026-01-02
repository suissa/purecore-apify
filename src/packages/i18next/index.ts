/**
 * Minimal i18next Implementation
 */

export interface InitOptions {
  lng?: string;
  fallbackLng?: string;
  resources?: Record<string, any>;
  interpolation?: {
    escapeValue?: boolean;
  };
}

class I18next {
  private options: InitOptions = {};
  private resources: Record<string, any> = {};

  use(module: any) {
    // Just for compatibility
    return this;
  }

  async init(options: InitOptions) {
    this.options = options;
    this.resources = options.resources || {};
    return this.t;
  }

  t(key: string, options?: any): string {
    const lng = this.options.lng || "en";
    const translation = this.resources[lng]?.translation || {};
    return translation[key] || key;
  }
}

export const i18next = new I18next();
export const initReactI18next = { type: "3rdParty", init: () => {} };

export default i18next;
