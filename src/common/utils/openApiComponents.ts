import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

/**
 * Register the reusable bearerAuth security scheme on a given OpenAPIRegistry.
 * Returns the registered component so callers can reference its `.name` when
 * adding `security: [{ [name]: [] }]` to path definitions.
 */
export function registerBearerAuth(registry: OpenAPIRegistry) {
    return registry.registerComponent(
        "securitySchemes",
        "bearerAuth",
        {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
        }
    );
}
