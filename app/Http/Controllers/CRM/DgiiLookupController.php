<?php

// app/Http/Controllers/CRM/DgiiLookupController.php
namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\DgiiTaxpayer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Cache;

class DgiiLookupController extends Controller
{
    public function find(Request $req)
    {
        // Puedes usar Gate + permiso Spatie
        if (! $req->user()->can('dgii.lookup')) {
            abort(403);
        }

        $data = $req->validate([
            'doc_type'   => ['required', 'in:RNC,CED'],
            'doc_number' => ['required', 'string'],
        ]);

        $type = strtoupper($data['doc_type']);
        $raw  = (string)$data['doc_number'];
        $norm = preg_replace('/\D+/', '', $raw);

        // Validación de longitud mínima: RNC=9, CED=11
        if (($type === 'RNC' && strlen($norm) !== 9) || ($type === 'CED' && strlen($norm) !== 11)) {
            return response()->json(['found' => false, 'reason' => 'invalid_length'], 200);
        }

        // Cache local opcional (la DB es tuya, pero esto evita hits repetidos)
        $key = "dgii:{$type}:{$norm}";
        $t = Cache::remember($key, now()->addHours(6), function () use ($type, $norm) {
            return DgiiTaxpayer::query()->byDoc($type, $norm)->first();
        });

        if (! $t) {
            return response()->json(['found' => false], 200);
        }

        return response()->json([
            'found'        => true,
            'doc_type'     => $t->doc_type,
            'doc_number'   => $t->doc_number,
            'name'         => $t->name,
            'status'       => $t->status,       // p.ej. ACTIVO
            'is_taxpayer'  => (bool)$t->is_taxpayer,
            'padron_date'  => optional($t->padron_date)->toDateString(),
        ]);
    }
}
