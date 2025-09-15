<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use Throwable;

class Handler extends ExceptionHandler
{
    // no toques $levels/$dontReport salvo que quieras silenciar algo

    public function register(): void
    {
        // 1) Validación: ya trae mensajes por campo
        $this->renderable(function (ValidationException $e, $request) {
            if ($this->isInertia($request)) {
                return back()
                    ->withErrors($e->errors(), $e->errorBag)
                    ->withInput();
            }
        });

        // 2) Autorización/políticas (403) -> toast genérico
        $this->renderable(function (AuthorizationException $e, $request) {
            if ($this->isInertia($request)) {
                return back()->with('error', 'No tienes permiso para esta acción.');
            }
        });

        // 3) No encontrado (404) -> redirige a índice o dashboard
        $this->renderable(function (ModelNotFoundException $e, $request) {
            if ($this->isInertia($request)) {
                return redirect()
                    ->route('dashboard')
                    ->with('error', 'Recurso no encontrado.');
            }
        });

        // 4) Errores de BD (ej. UNIQUE, FK) -> mensaje amable
        $this->renderable(function (QueryException $e, $request) {
            if ($this->isInertia($request)) {
                // PgSQL UNIQUE = 23505. Ajusta si usas MySQL (23000)
                $sqlState = $e->errorInfo[0] ?? null;
                $code     = $e->getCode();

                // UNIQUE
                if ($sqlState === '23505' || $code === '23505') {
                    // Si quieres, detecta por texto/tabla/columna para mensajes más finos
                    return back()
                        ->withErrors(['_global' => 'Ya existe un registro con esos datos. Revisa los campos únicos.'])
                        ->withInput();
                }

                // FK, etc. (23503)
                if ($sqlState === '23503' || $code === '23503') {
                    return back()
                        ->with('error', 'Operación no permitida por dependencias. Verifica relaciones.')
                        ->withInput();
                }

                // Otros
                return back()
                    ->with('error', 'Ocurrió un error de base de datos.')
                    ->withInput();
            }
        });

        // 5) Cualquier otro error inesperado
        $this->renderable(function (Throwable $e, $request) {
            if ($this->isInertia($request)) {
                // Lo reportamos para logs, pero al usuario le damos un mensaje limpio
                report($e);
                return back()
                    ->with('error', 'Ups, algo salió mal. Intenta nuevamente.')
                    ->withInput();
            }
        });
    }

    private function isInertia($request): bool
    {
        // Todas las peticiones Inertia llevan este header
        return $request->header('X-Inertia') === 'true';
    }
}
