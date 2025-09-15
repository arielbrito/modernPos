<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DgiiSyncService
{
    /**
     * Importa padrón DGII desde CSV/TXT.
     *
     * @param  string        $path
     * @param  callable|null $onProgress   Callback($total) cada $tickEvery filas
     * @param  int           $tickEvery
     * @param  int|null      $limit
     * @param  bool          $dryRun
     * @param  int           $commitEvery
     * @param  string|null   $sourceVersion  Etiqueta del origen (opcional)
     * @param  string|null   $padronDate     YYYY-MM-DD (opcional)
     * @return int
     */
    public function importCsv(
        string $path,
        ?callable $onProgress = null,
        int $tickEvery = 5000,
        ?int $limit = null,
        bool $dryRun = false,
        int $commitEvery = 10000,
        ?string $sourceVersion = null,
        ?string $padronDate = null,
    ): int {
        if (!is_file($path)) {
            throw new \RuntimeException("Archivo no existe: {$path}");
        }

        $fh = fopen($path, 'r');
        if (!$fh) {
            throw new \RuntimeException("No se pudo abrir: {$path}");
        }

        // Detectar delimitador
        $first = fgets($fh);
        if ($first === false) {
            fclose($fh);
            return 0;
        }
        $delims = [',', ';', '|', "\t"];
        $bestDelim = ',';
        $bestCount = -1;
        foreach ($delims as $d) {
            $c = substr_count($first, $d);
            if ($c > $bestCount) {
                $bestCount = $c;
                $bestDelim = $d;
            }
        }
        rewind($fh);

        $count = 0;
        $batch = 0;

        if (!$dryRun) {
            DB::beginTransaction();
        }

        try {
            while (($row = fgetcsv($fh, 0, $bestDelim)) !== false) {
                if (count($row) === 0) continue;

                // Normalizar encoding / trim
                foreach ($row as &$col) {
                    if ($col !== '' && !mb_detect_encoding($col, 'UTF-8', true)) {
                        $col = iconv('ISO-8859-1', 'UTF-8//IGNORE', $col);
                    }
                    $col = trim($col, " \t\n\r\0\x0B\""); // quita comillas/espacios
                }
                unset($col);

                // Saltar encabezado típico
                $col0 = (string)($row[0] ?? '');
                $digits = preg_replace('/\D+/', '', $col0 ?? '');
                if ($digits === '' || in_array(strtoupper($col0), ['RNC', 'CED', 'DOCUMENTO', 'DOCUMENT'])) {
                    continue;
                }

                // Determinar tipo por longitud
                $len = strlen($digits);
                if ($len === 9) {
                    $docType = 'RNC';
                } elseif ($len === 11) {
                    $docType = 'CED';
                } else {
                    // No RNC ni Cédula válidos
                    continue;
                }

                $name   = (string)($row[1] ?? '');
                $status = (string)($row[4] ?? null);

                if (!$dryRun) {
                    $payload = [
                        'doc_type'        => $docType,
                        'doc_number'      => $col0 ?: $digits,
                        'doc_number_norm' => $digits,
                        'name'            => $name !== '' ? $name : $digits,
                        'status'          => $status,
                        'is_taxpayer'     => true,
                        'raw'             => json_encode($row, JSON_UNESCAPED_UNICODE),
                        'source_version'  => $sourceVersion,
                        'padron_date'     => $padronDate,
                        'updated_at'      => now(),
                        'created_at'      => now(),
                    ];

                    // upsert por clave compuesta (doc_type, doc_number_norm)
                    DB::table('dgii_taxpayers')->upsert(
                        [$payload],
                        ['doc_type', 'doc_number_norm'],
                        ['doc_number', 'name', 'status', 'is_taxpayer', 'raw', 'source_version', 'padron_date', 'updated_at']
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
                    $onProgress($count);
                }
                if ($limit && $count >= $limit) {
                    break;
                }
            }

            fclose($fh);
            if (!$dryRun) DB::commit();
        } catch (\Throwable $e) {
            if (is_resource($fh)) fclose($fh);
            if (!$dryRun) DB::rollBack();
            throw $e;
        }

        if ($onProgress) $onProgress($count);
        return $count;
    }

    /**
     * Buscar un contribuyente por documento “libre” (con o sin guiones).
     * @return array|null
     */
    public function lookupByDocument(string $doc): ?array
    {
        $digits = preg_replace('/\D+/', '', $doc);
        $len = strlen($digits);
        $docType = $len === 9 ? 'RNC' : ($len === 11 ? 'CED' : null);
        if (!$docType) return null;

        $row = DB::table('dgii_taxpayers')
            ->where('doc_type', $docType)
            ->where('doc_number_norm', $digits)
            ->first();

        return $row ? (array)$row : null;
    }

    /**
     * Sincroniza bandera is_taxpayer (y nombre si aplica) a customers.
     * - Si customers.document_number_norm existe, se usa.
     * - Si no existe, normaliza al vuelo con REGEXP_REPLACE.
     */
    public function syncCustomersFromDgii(): void
    {
        if (!Schema::hasTable('customers')) return;

        $hasDocNorm = Schema::hasColumn('customers', 'document_number_norm');
        $hasDocType = Schema::hasColumn('customers', 'document_type');

        if ($hasDocNorm && $hasDocType) {
            // Versión con normalizado persistido
            DB::statement("
                UPDATE customers c
                   SET is_taxpayer = TRUE,
                       name = CASE WHEN (c.name IS NULL OR c.name = '') THEN d.name ELSE c.name END
                  FROM dgii_taxpayers d
                 WHERE UPPER(COALESCE(c.document_type,'NONE')) IN ('RNC','CED')
                   AND d.doc_type = UPPER(c.document_type)
                   AND c.document_number_norm = d.doc_number_norm
            ");
        } elseif ($hasDocType && Schema::hasColumn('customers', 'document_number')) {
            // Normaliza al vuelo si no tienes document_number_norm
            DB::statement("
                UPDATE customers c
                   SET is_taxpayer = TRUE,
                       name = CASE WHEN (c.name IS NULL OR c.name = '') THEN d.name ELSE c.name END
                  FROM dgii_taxpayers d
                 WHERE UPPER(COALESCE(c.document_type,'NONE')) IN ('RNC','CED')
                   AND d.doc_type = UPPER(c.document_type)
                   AND REGEXP_REPLACE(COALESCE(c.document_number,''), '\\D', '', 'g') = d.doc_number_norm
            ");
        }
    }
}
