<?php

// app/Http/Controllers/Fiscal/NcfSequenceController.php
namespace App\Http\Controllers\Fiscal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fiscal\StoreNcfSequenceRequest;
use App\Http\Requests\Fiscal\UpdateNcfSequenceRequest;
use App\Models\{NcfSequence, Store, NcfType};
use Illuminate\Http\Request;
use Inertia\Inertia;

class NcfSequenceController extends Controller
{
    public function index(Request $r)
    {
        $this->authorize('viewAny', \App\Models\User::class); // o policy dedicada
        $rows = NcfSequence::with(['store:id,name', 'type:code,name'])
            ->orderBy('store_id')->orderBy('ncf_type_code')
            ->paginate(20)->withQueryString();

        return Inertia::render('fiscal/ncf/index', [
            'rows' => $rows,
            'stores' => Store::select('id', 'name')->get(),
            'types' => NcfType::select('code', 'name')->get(),
        ]);
    }

    public function store(StoreNcfSequenceRequest $req)
    {
        NcfSequence::updateOrCreate(
            ['store_id' => $req->store_id, 'ncf_type_code' => $req->ncf_type_code],
            $req->validated()
        );

        return back()->with('success', 'Secuencia guardada.');
    }

    public function update(UpdateNcfSequenceRequest $req, NcfSequence $sequence)
    {
        $sequence->update($req->validated());
        return back()->with('success', 'Secuencia actualizada.');
    }

    public function destroy(NcfSequence $sequence)
    {
        $this->authorize('manage', \App\Models\User::class);
        $sequence->delete();
        return back()->with('success', 'Secuencia eliminada.');
    }
}
