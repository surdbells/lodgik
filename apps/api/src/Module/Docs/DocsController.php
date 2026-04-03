<?php

declare(strict_types=1);

namespace Lodgik\Module\Docs;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Tenant-facing API documentation endpoints.
 *
 * GET /api/docs             — Swagger UI (JWT-authenticated)
 * GET /api/docs/openapi.yaml — Raw OpenAPI spec (JWT-authenticated)
 */
final class DocsController
{
    private string $specPath;

    public function __construct(string $specPath = '')
    {
        $this->specPath = $specPath ?: __DIR__ . '/../../../public/docs/openapi.yaml';
    }

    /**
     * GET /api/docs
     * Swagger UI configured to fetch the spec through JWT auth.
     */
    public function ui(Request $request, Response $response): Response
    {
        $baseUrl = rtrim($_ENV['APP_URL'] ?? 'https://api.lodgik.co', '/');
        $specUrl = $baseUrl . '/api/docs/openapi.yaml';

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lodgik API Reference</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>body { margin: 0; } .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    const token = localStorage.getItem('lodgik_access_token') || '';
    SwaggerUIBundle({
      url: '$specUrl',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: true,
      requestInterceptor: (req) => {
        if (token) req.headers['Authorization'] = 'Bearer ' + token;
        return req;
      },
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>
HTML;

        $response->getBody()->write($html);
        return $response->withHeader('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * GET /api/docs/openapi.yaml
     * Returns the spec with the live server URL injected.
     * Requires valid JWT (enforced by AuthMiddleware on this route group).
     */
    public function spec(Request $request, Response $response): Response
    {
        if (!file_exists($this->specPath)) {
            $response->getBody()->write(json_encode(['error' => 'API spec not found']));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }

        $yaml    = file_get_contents($this->specPath);
        $baseUrl = rtrim($_ENV['APP_URL'] ?? 'https://api.lodgik.co', '/');

        // Replace servers block with live URL so Swagger UI Try-it-out hits the real API
        $yaml = preg_replace(
            '/^servers:.*?(?=^\w|\z)/ms',
            "servers:\n  - url: {$baseUrl}\n    description: Lodgik Production API\n",
            $yaml,
        );

        $response->getBody()->write($yaml);
        return $response
            ->withHeader('Content-Type', 'application/yaml')
            ->withHeader('Content-Disposition', 'inline; filename="lodgik-openapi.yaml"');
    }
}
