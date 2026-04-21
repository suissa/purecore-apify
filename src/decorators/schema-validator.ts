import { ValidationError } from "../errors.js";

/**
 * Schema Validator - Valida dados usando múltiplas bibliotecas
 */

type SchemaType = "zod" | "joi" | "yup" | "ajv";

interface SchemaValidatorOptions {
  /** Tipo do schema */
  type: SchemaType;
  /** Schema de validação */
  schema: any;
  /** Campo a ser validado (body, params, query, etc.) */
  field?: "body" | "params" | "query" | "headers" | string;
  /** Mensagem de erro customizada */
  message?: string;
  /** Transformar dados após validação */
  transform?: boolean;
}

/**
 * Validador para schemas Zod
 */
function validateZod(schema: any, data: any, transform = false) {
  try {
    const result = transform ? schema.parse(data) : schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
        value: err.code,
      }));
      return { success: false, errors };
    }
  } catch (error: any) {
    return { success: false, errors: [{ message: error.message }] };
  }
}

/**
 * Validador para schemas Joi
 */
function validateJoi(schema: any, data: any) {
  try {
    const result = schema.validate(data, { abortEarly: false });
    if (result.error) {
      const errors = result.error.details.map((detail: any) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));
      return { success: false, errors };
    }
    return { success: true, data: result.value };
  } catch (error: any) {
    return { success: false, errors: [{ message: error.message }] };
  }
}

/**
 * Validador para schemas Yup
 */
function validateYup(schema: any, data: any) {
  try {
    const result = schema.validateSync(data, { abortEarly: false });
    return { success: true, data: result };
  } catch (error: any) {
    const errors = error.errors.map((msg: string, index: number) => ({
      field: error.path || `field_${index}`,
      message: msg,
      value: error.value,
    }));
    return { success: false, errors };
  }
}

/**
 * Validador para schemas AJV
 */
function validateAjv(schema: any, data: any) {
  try {
    // Nota: AJV precisa ser configurado separadamente
    // Por simplicidade, assumimos que já está validado
    if (typeof schema === "function") {
      const result = schema(data);
      if (result) {
        return { success: true, data };
      }
    }
    return { success: false, errors: [{ message: "AJV validation failed" }] };
  } catch (error: any) {
    return { success: false, errors: [{ message: error.message }] };
  }
}

/**
 * Decorator para validação de schemas
 */
export function SchemaValidator(options: SchemaValidatorOptions) {
  const { type, schema, field = "body", message, transform = false } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Encontra o campo a ser validado
      let dataToValidate: any;

      if (field === "body") {
        // Assume que o primeiro argumento é o request
        const req = args[0];
        dataToValidate = req?.body;
      } else if (field === "params") {
        const req = args[0];
        dataToValidate = req?.params;
      } else if (field === "query") {
        const req = args[0];
        dataToValidate = req?.query;
      } else if (field === "headers") {
        const req = args[0];
        dataToValidate = req?.headers;
      } else {
        // Campo customizado
        const req = args[0];
        dataToValidate = req?.[field];
      }

      if (dataToValidate === undefined) {
        throw new ValidationError(
          `Campo '${field}' não encontrado para validação`
        );
      }

      // Executa validação baseada no tipo
      let validationResult: { success: boolean; data?: any; errors?: any[] };

      switch (type) {
        case "zod":
          validationResult = validateZod(schema, dataToValidate, transform);
          break;
        case "joi":
          validationResult = validateJoi(schema, dataToValidate);
          break;
        case "yup":
          validationResult = validateYup(schema, dataToValidate);
          break;
        case "ajv":
          validationResult = validateAjv(schema, dataToValidate);
          break;
        default:
          throw new Error(`Tipo de schema não suportado: ${type}`);
      }

      if (!validationResult.success) {
        const errorMessage = message || "Dados inválidos";
        const fieldErrors = validationResult.errors || [];

        if (fieldErrors.length > 0) {
          throw new ValidationError(
            errorMessage,
            fieldErrors[0].field,
            fieldErrors[0].value
          );
        } else {
          throw new ValidationError(errorMessage);
        }
      }

      // Substitui os dados validados se foi especificado
      if (validationResult.data !== undefined) {
        if (field === "body") {
          args[0].body = validationResult.data;
        } else if (field === "params") {
          args[0].params = validationResult.data;
        } else if (field === "query") {
          args[0].query = validationResult.data;
        } else if (field === "headers") {
          args[0].headers = validationResult.data;
        } else {
          args[0][field] = validationResult.data;
        }
      }

      // Executa método original
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helpers para tipos específicos
 */
export function ZodValidator(schema: any, field = "body", transform = true) {
  return SchemaValidator({ type: "zod", schema, field, transform });
}

export function JoiValidator(schema: any, field = "body") {
  return SchemaValidator({ type: "joi", schema, field });
}

export function YupValidator(schema: any, field = "body") {
  return SchemaValidator({ type: "yup", schema, field });
}

export function AjvValidator(schema: any, field = "body") {
  return SchemaValidator({ type: "ajv", schema, field });
}

/**
 * Validador para múltiplos campos
 */
export function MultiFieldValidator(validators: SchemaValidatorOptions[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // Combina todos os validadores usando PresetDecoratorFactory
    const combinedValidators = validators.map((options) =>
      SchemaValidator(options)
    );
    const { PresetDecoratorFactory } = require("./preset.js");

    return PresetDecoratorFactory(combinedValidators)(
      target,
      propertyKey,
      descriptor
    );
  };
}
