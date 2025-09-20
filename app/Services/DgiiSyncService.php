<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DgiiSyncService
{
    /**
     * Cuenta rápidamente el número de líneas en un archivo.
     * Esencial para calcular el progreso de la importación.
     *
     * @param string $path Ruta al archivo.
     * @return int Número total de líneas.
     */
    public function countRows(string $path): int
    {
        if (!is_file($path) || !is_readable($path)) {
            return 0;
        }
        $fh = fopen($path, 'r');
        if (!$fh) return 0;

        $count = 0;
        while (fgets($fh) !== false) {
            $count++;
        }
        fclose($fh);
        return $count;
    }

    /**
     * Importa el padrón de contribuyentes de la DGII desde un archivo CSV o TXT.
     * Esta versión está optimizada para ser llamada desde un Job en segundo plano.
     *
     * @param string $path La ruta al archivo a importar.
     * @param int $totalRows El número total de filas en el archivo (obtenido de countRows).
     * @param callable|null $onProgress Callback que se ejecuta periódicamente. Recibe: fn(int $processed, int $total, array $stats).
     * @param int $tickEvery Frecuencia (en filas) con la que se llamará a $onProgress.
     * @param int|null $limit Limita el número de filas a procesar (para pruebas).
     * @param bool $dryRun Si es true, no escribe en la base de datos.
     * @param int $commitEvery Frecuencia (en filas) para hacer commit de la transacción.
     * @param string|null $sourceVersion Etiqueta de la versión del padrón (ej. "DGII 2025-09").
     * @param string|null $padronDate Fecha del padrón en formato YYYY-MM-DD.
     * @return array Resumen de la operación ['processed', 'duration', 'rate'].
     */
    public function importCsv(
        string $path,
        int $totalRows = 0,
        ?callable $onProgress = null,
        int $tickEvery = 1000,
        ?int $limit = null,
        bool $dryRun = false,
        int $commitEvery = 10000,
        ?string $sourceVersion = null,
        ?string $padronDate = null
    ): array {
        if (!is_file($path)) {
            throw new \RuntimeException("Archivo no existe: {$path}");
        }

        $fh = fopen($path, 'r');
        if (!$fh) {
            throw new \RuntimeException("No se pudo abrir: {$path}");
        }

        // --- Detección de delimitador ---
        $firstLine = fgets($fh);
        if ($firstLine === false) {
            fclose($fh);
            return ['processed' => 0, 'duration' => 0, 'rate' => 0];
        }
        $delimiters = [',', ';', '|', "\t"];
        $bestDelimiter = ',';
        $bestCount = -1;
        foreach ($delimiters as $d) {
            $c = substr_count($firstLine, $d);
            if ($c > $bestCount) {
                $bestCount = $c;
                $bestDelimiter = $d;
            }
        }
        rewind($fh);
        // --- Fin Detección ---

        $count = 0;
        $batch = 0;
        $start = microtime(true);

        if (!$dryRun) {
            DB::beginTransaction();
        }

        try {
            while (($row = fgetcsv($fh, 0, $bestDelimiter)) !== false) {
                if (empty($row) || $row[0] === null) continue;

                // Normalizar y limpiar datos de la fila
                $cleanedRow = $this->normalizeRow($row);
                if (empty($cleanedRow)) continue;

                $docData = $this->extractDocumentData($cleanedRow);
                if ($docData === null) continue; // Saltar si no es RNC/Cédula válido

                if (!$dryRun) {
                    $payload = $this->createPayload($docData, $cleanedRow, $sourceVersion, $padronDate);

                    DB::table('dgii_taxpayers')->upsert(
                        [$payload],
                        ['doc_type', 'doc_number_norm'],
                        array_keys($payload) // Actualizar todas las columnas
                    );

                    $batch++;
                    if ($batch >= $commitEvery) {
                        DB::commit();
                        DB::beginTransaction();
                        $batch = 0;
                    }
                }

                $count++;

                if ($onProgress && ($count % $tickEvery === 0)) {
                    $elapsed = microtime(true) - $start;
                    $rate = $elapsed > 0 ? $count / $elapsed : 0;
                    $onProgress($count, $totalRows, ['elapsed' => $elapsed, 'rate' => $rate]);
                }

                if ($limit && $count >= $limit) {
                    break;
                }
            }

            if (!$dryRun) DB::commit();
        } catch (Throwable $e) {
            if (!$dryRun) DB::rollBack();
            throw $e; // Re-lanzar para que el Job lo capture
        } finally {
            if (is_resource($fh)) fclose($fh);
        }

        $elapsed = microtime(true) - $start;
        $rate = $elapsed > 0 ? $count / $elapsed : 0;

        if ($onProgress) {
            $onProgress($count, $totalRows, ['elapsed' => $elapsed, 'rate' => $rate]);
        }

        return [
            'processed' => $count,
            'duration' => $elapsed,
            'rate' => $rate
        ];
    }

    /**
     * Sincroniza la bandera `is_taxpayer` y opcionalmente el nombre en la tabla `customers`.
     */
    public function syncCustomersFromDgii(): void
    {
        if (!Schema::hasTable('customers')) return;

        $query = "
            UPDATE customers c
            SET is_taxpayer = TRUE,
                name = CASE WHEN (c.name IS NULL OR c.name = '') THEN d.name ELSE c.name END
            FROM dgii_taxpayers d
            WHERE UPPER(COALESCE(c.document_type,'NONE')) IN ('RNC','CED')
              AND d.doc_type = UPPER(c.document_type)
              AND %s = d.doc_number_norm
        ";

        if (Schema::hasColumn('customers', 'document_number_norm')) {
            $condition = "c.document_number_norm";
        } elseif (Schema::hasColumn('customers', 'document_number')) {
            // Asume PostgreSQL, para MySQL usar REGEXP_REPLACE(..., '\\\\D', '')
            $condition = "REGEXP_REPLACE(COALESCE(c.document_number,''), '\\D', '', 'g')";
        } else {
            return; // No hay columnas de documento para comparar
        }

        DB::statement(sprintf($query, $condition));
    }


    // --- Métodos Privados de Ayuda ---

    private function normalizeRow(array $row): array
    {
        $normalized = [];
        foreach ($row as $col) {
            $col = (string) $col;
            if ($col !== '' && !mb_detect_encoding($col, 'UTF-8', true)) {
                $col = iconv('ISO-8859-1', 'UTF-8//IGNORE', $col);
            }
            $normalized[] = trim($col, " \t\n\r\0\x0B\"");
        }
        return $normalized;
    }

    private function extractDocumentData(array $row): ?array
    {
        $col0 = $row[0] ?? '';
        $digits = preg_replace('/\D+/', '', $col0);

        if ($digits === '' || in_array(strtoupper($col0), ['RNC', 'CED', 'DOCUMENTO'])) {
            return null;
        }

        $len = strlen($digits);
        if ($len === 9) {
            $docType = 'RNC';
        } elseif ($len === 11) {
            $docType = 'CED';
        } else {
            return null;
        }

        return [
            'doc_type' => $docType,
            'doc_number' => $col0,
            'doc_number_norm' => $digits,
            'name' => (string)($row[1] ?? ''),
            'status' => (string)($row[4] ?? 'Activo'),
        ];
    }

    private function createPayload(array $docData, array $rawRow, ?string $sourceVersion, ?string $padronDate): array
    {
        return [
            'doc_type'          => $docData['doc_type'],
            'doc_number'        => $docData['doc_number'],
            'doc_number_norm'   => $docData['doc_number_norm'],
            'name'              => $docData['name'] !== '' ? $docData['name'] : $docData['doc_number_norm'],
            'status'            => $docData['status'],
            'is_taxpayer'       => true,
            'raw'               => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
            'source_version'    => $sourceVersion,
            'padron_date'       => $padronDate,
            'updated_at'        => now(),
            'created_at'        => now(),
        ];
    }
}
