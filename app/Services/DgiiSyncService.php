<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DgiiSyncService
{
    // =========================
    // Config por defecto
    // =========================
    private const DEFAULT_TICK_EVERY     = 1_000;  // filas entre callbacks de progreso
    private const DEFAULT_BUFFER_UPSERT  = 1_000;  // filas por upsert() en batch
    private const DEFAULT_COMMIT_EVERY   = 10_000; // filas por commit de transacción

    // Tabla y clave única (ajustable si alguna vez cambia)
    private const TABLE                  = 'dgii_taxpayers';
    private const UNIQUE_BY              = ['doc_type', 'doc_number_norm'];

    /**
     * Contar líneas de forma streaming (soporta .gz)
     */
    public function countRows(string $path): int
    {
        if (!is_file($path) || !is_readable($path)) return 0;

        $fh = $this->openHandle($path);
        if (!$fh) return 0;

        $count = 0;
        while (fgets($fh) !== false) $count++;
        fclose($fh);
        return $count;
    }

    /**
     * Importa el padrón de la DGII desde CSV/CSV.GZ/TXT con lectura streaming.
     */
    public function importCsv(
        string $path,
        int $totalRows = 0,
        ?callable $onProgress = null,
        int $tickEvery = self::DEFAULT_TICK_EVERY,
        ?int $limit = null,
        bool $dryRun = false,
        int $commitEvery = self::DEFAULT_COMMIT_EVERY,
        ?string $sourceVersion = null,
        ?string $padronDate = null,
        int $bufferUpsert = self::DEFAULT_BUFFER_UPSERT
    ): array {
        if (!is_file($path)) {
            throw new \RuntimeException("Archivo no existe: {$path}");
        }

        $fh = $this->openHandle($path);
        if (!$fh) {
            throw new \RuntimeException("No se pudo abrir: {$path}");
        }

        // Detectar delimitador por muestreo
        [$delimiter, $hasHeader] = $this->detectDelimiterAndHeader($fh);

        // Stats
        $count            = 0;
        $skippedInvalid   = 0;
        $errors           = 0;
        $estimatedUpserts = 0;

        $start = microtime(true);
        $buffer = [];

        // Performance: desactivar query log en imports largos
        DB::connection()->disableQueryLog();

        if (!$dryRun) {
            DB::beginTransaction();
        }

        try {
            // Si hay encabezado, lo consumimos (ya hicimos rewind en detect)
            if ($hasHeader) {
                fgetcsv($fh, 0, $delimiter);
            }

            while (($row = fgetcsv($fh, 0, $delimiter)) !== false) {
                if (empty($row) || ($row[0] ?? null) === null) {
                    $skippedInvalid++;
                    continue;
                }

                try {
                    $cleanedRow = $this->normalizeRow($row);
                    if (empty($cleanedRow)) {
                        $skippedInvalid++;
                        continue;
                    }

                    $docData = $this->extractDocumentData($cleanedRow);
                    if ($docData === null) {
                        $skippedInvalid++;
                        continue;
                    }

                    if (!$dryRun) {
                        $payload   = $this->createPayload($docData, $cleanedRow, $sourceVersion, $padronDate);
                        $buffer[]  = $payload;

                        // Si llena el buffer, hacemos un upsert en lote
                        if (\count($buffer) >= $bufferUpsert) {
                            $this->flushUpsertBuffer($buffer);
                            $estimatedUpserts += \count($buffer);
                            $buffer = [];
                        }
                    }

                    $count++;

                    if ($onProgress && ($count % $tickEvery === 0)) {
                        $elapsed = microtime(true) - $start;
                        $rate    = $elapsed > 0 ? $count / $elapsed : 0;
                        $onProgress($count, $totalRows, [
                            'elapsed'         => $elapsed,
                            'rate'            => $rate,
                            'skipped_invalid' => $skippedInvalid,
                            'errors'          => $errors,
                            'mem_mb'          => round(memory_get_usage(true) / 1024 / 1024, 1),
                        ]);
                    }

                    if ($limit && $count >= $limit) {
                        break;
                    }

                    // Commit por bloques de filas procesadas
                    if (!$dryRun && ($count % $commitEvery === 0)) {
                        // flush antes del commit para dejar limpio
                        if (!empty($buffer)) {
                            $this->flushUpsertBuffer($buffer);
                            $estimatedUpserts += \count($buffer);
                            $buffer = [];
                        }
                        DB::commit();
                        DB::beginTransaction();
                    }
                } catch (\Throwable $rowEx) {
                    $errors++;
                    // Continúa con la siguiente fila (no aborta todo el proceso)
                    // Podrías loguear el error puntual aquí si lo necesitas
                }
            }

            // Flush final del buffer pendiente
            if (!$dryRun && !empty($buffer)) {
                $this->flushUpsertBuffer($buffer);
                $estimatedUpserts += \count($buffer);
                $buffer = [];
            }

            if (!$dryRun) DB::commit();
        } catch (Throwable $e) {
            if (!$dryRun) DB::rollBack();
            if (is_resource($fh)) fclose($fh);
            throw $e;
        } finally {
            if (is_resource($fh)) fclose($fh);
        }

        $elapsed = microtime(true) - $start;
        $rate    = $elapsed > 0 ? $count / $elapsed : 0;

        if ($onProgress) {
            $onProgress($count, $totalRows, [
                'elapsed'         => $elapsed,
                'rate'            => $rate,
                'skipped_invalid' => $skippedInvalid,
                'errors'          => $errors,
                'mem_mb'          => round(memory_get_peak_usage(true) / 1024 / 1024, 1),
            ]);
        }

        return [
            'processed'        => $count,
            'duration'         => $elapsed,
            'rate'             => $rate,
            'skipped_invalid'  => $skippedInvalid,
            'errors'           => $errors,
            // No sabemos con certeza insert vs update; esto es el nº de filas enviadas a upsert
            'upserts'          => $estimatedUpserts,
        ];
    }

    /**
     * Sincroniza bandera `is_taxpayer` y opcionalmente el nombre en `customers`.
     */
    public function syncCustomersFromDgii(): void
    {
        if (!Schema::hasTable('customers')) return;

        $query = "
            UPDATE customers c
               SET is_taxpayer = TRUE,
                   name = CASE WHEN (c.name IS NULL OR c.name = '') THEN d.name ELSE c.name END
              FROM " . self::TABLE . " d
             WHERE UPPER(COALESCE(c.document_type,'NONE')) IN ('RNC','CED')
               AND d.doc_type = UPPER(c.document_type)
               AND %s = d.doc_number_norm
        ";

        if (Schema::hasColumn('customers', 'document_number_norm')) {
            $condition = "c.document_number_norm";
        } elseif (Schema::hasColumn('customers', 'document_number')) {
            // PostgreSQL: quitar no-dígitos
            $condition = "REGEXP_REPLACE(COALESCE(c.document_number,''), '\\D', '', 'g')";
        } else {
            return;
        }

        DB::statement(sprintf($query, $condition));
    }

    // =========================
    // Helpers privados
    // =========================

    /**
     * Abrir handle compatible con .gz (compress.zlib://)
     */
    private function openHandle(string $path)
    {
        $lower = strtolower($path);
        if (str_ends_with($lower, '.gz')) {
            return fopen('compress.zlib://' . $path, 'r');
        }
        return fopen($path, 'r');
    }

    /**
     * Detectar delimitador y si hay header por muestreo.
     * Lee hasta 100 líneas no vacías, evalúa delimitadores y el “shape”.
     */
    private function detectDelimiterAndHeader($fh): array
    {
        $candidates  = [',', ';', '|', "\t"];
        $samples     = [];
        $maxSamples  = 100;

        // Lee muestra
        $pos0 = ftell($fh);
        while (count($samples) < $maxSamples && ($line = fgets($fh)) !== false) {
            $line = trim($line);
            if ($line === '') continue;
            $samples[] = $line;
        }

        // Si no hay suficientes líneas, fallback a coma
        if (empty($samples)) {
            rewind($fh);
            return [',', false];
        }

        // Escoge el delimitador por el que más consistente sea el recuento de columnas
        $bestDelimiter = ',';
        $bestScore     = -INF; // mayor es mejor

        foreach ($candidates as $d) {
            $counts = array_map(fn($ln) => substr_count($ln, $d), $samples);
            if (array_sum($counts) === 0) continue;

            // “Consistencia” = media alta con desviación baja
            $mean = array_sum($counts) / max(1, count($counts));
            $var  = 0.0;
            foreach ($counts as $c) {
                $var += ($c - $mean) ** 2;
            }
            $var = $var / max(1, count($counts));
            $score = $mean - sqrt($var); // preferimos columnas numerosas y estables

            if ($score > $bestScore) {
                $bestScore     = $score;
                $bestDelimiter = $d;
            }
        }

        // Rewind y usar fgetcsv con el delimitador ganador para ver si la primera fila “parece” header
        fseek($fh, $pos0);
        $firstRow = fgetcsv($fh, 0, $bestDelimiter) ?: [];
        $hasHeader = false;
        if (!empty($firstRow)) {
            $col0 = strtoupper(trim((string)($firstRow[0] ?? '')));
            if ($col0 === 'DOCUMENTO' || $col0 === 'RNC' || $col0 === 'CED') {
                $hasHeader = true;
            } else {
                // Heurística extra: si col0 tiene pocas cifras y más letras, también parece header
                $digits = preg_replace('/\D+/', '', (string)($firstRow[0] ?? ''));
                if ($digits === '' && preg_match('/[A-Z]/', $col0)) {
                    $hasHeader = true;
                }
            }
        }

        // Volver al inicio para que el bucle principal lea desde el comienzo
        rewind($fh);

        return [$bestDelimiter, $hasHeader];
    }

    private function normalizeRow(array $row): array
    {
        $normalized = [];
        foreach ($row as $col) {
            $col = (string) $col;

            // Normalizar a UTF-8 (best effort)
            if ($col !== '' && !mb_detect_encoding($col, 'UTF-8', true)) {
                $tmp = @iconv('ISO-8859-1', 'UTF-8//IGNORE', $col);
                if ($tmp !== false) $col = $tmp;
            }
            // Trim y quitar comillas envolventes residuales
            $col = trim($col, " \t\n\r\0\x0B\"");

            $normalized[] = $col;
        }
        return $normalized;
    }

    private function extractDocumentData(array $row): ?array
    {
        $col0   = $row[0] ?? '';
        $digits = preg_replace('/\D+/', '', $col0);

        // Encabezados u obvios no-datos
        if ($digits === '' || in_array(strtoupper($col0), ['RNC', 'CED', 'DOCUMENTO'], true)) {
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
            'doc_type'        => $docType,
            'doc_number'      => $col0,
            'doc_number_norm' => $digits,
            'name'            => (string)($row[1] ?? ''),
            'status'          => (string)($row[4] ?? 'Activo'),
        ];
    }

    private function createPayload(array $docData, array $rawRow, ?string $sourceVersion, ?string $padronDate): array
    {
        return [
            'doc_type'        => $docData['doc_type'],
            'doc_number'      => $docData['doc_number'],
            'doc_number_norm' => $docData['doc_number_norm'],
            'name'            => $docData['name'] !== '' ? $docData['name'] : $docData['doc_number_norm'],
            'status'          => $docData['status'],
            'is_taxpayer'     => true,
            'raw'             => json_encode($rawRow, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            'source_version'  => $sourceVersion,
            'padron_date'     => $padronDate,
            'updated_at'      => now(),
            'created_at'      => now(),
        ];
    }

    /**
     * Hace upsert del buffer y vacía el arreglo por referencia.
     */
    private function flushUpsertBuffer(array &$buffer): void
    {
        if (empty($buffer)) return;

        // Todas las columnas del payload (usamos keys del primero)
        $columnsToUpdate = array_keys($buffer[0]);

        DB::table(self::TABLE)->upsert(
            $buffer,
            self::UNIQUE_BY,
            $columnsToUpdate
        );
    }
}
