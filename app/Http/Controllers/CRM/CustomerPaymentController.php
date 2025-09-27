<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\StoreCustomerPaymentRequest;
use App\Models\Customer;
use App\Models\CashMovement;
use App\Models\CashShift;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class CustomerPaymentController extends Controller
{
    public function store(StoreCustomerPaymentRequest $request, Customer $customer)
    {
        $data = $request->validated();

        DB::transaction(function () use ($customer, $data) {
            $paymentAmount = (float) $data['amount'];

            // --- 1. ACTUALIZAR EL BALANCE TOTAL DEL CLIENTE ---
            $customer->decrement('balance', $paymentAmount);

            // --- 2. APLICAR EL PAGO A LAS FACTURAS PENDIENTES (LÓGICA FIFO) ---
            $pendingSales = $customer->sales()
                ->where('due_total', '>', 0)
                ->orderBy('occurred_at', 'asc')
                ->get();

            $amountLeftToApply = $paymentAmount;

            foreach ($pendingSales as $sale) {
                if ($amountLeftToApply <= 0) {
                    break; // Salimos del bucle si ya aplicamos todo el pago
                }

                $amountToApply = min($amountLeftToApply, (float)$sale->due_total);

                $sale->increment('paid_total', $amountToApply);
                $sale->decrement('due_total', $amountToApply);

                // // (Opcional pero recomendado) Actualizar el estado de la venta si se salda por completo
                // if ($sale->due_total <= 0) {
                //     // Si tienes un estado como 'paid' o similar en tu enum 'sales.status'
                //     // $sale->update(['payment_status' => 'paid']); 
                // } else {
                //     // $sale->update(['payment_status' => 'partial']);
                // }

                $amountLeftToApply -= $amountToApply;
            }


            // --- 3. REGISTRAR MOVIMIENTO EN CAJA (SI APLICA) ---
            if ($data['method'] === 'cash') {
                $shift = CashShift::where('register_id', $data['register_id'])
                    ->where('status', 'open')
                    ->latest()
                    ->first();

                if (!$shift) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'register_id' => 'No hay un turno abierto para la caja seleccionada.',
                    ]);
                }

                CashMovement::create([
                    'shift_id'      => $shift->id,
                    'created_by'       => Auth::id(),
                    'direction'     => 'in',
                    'amount'        => $paymentAmount, // El monto total del abono
                    'currency_code' => 'DOP',
                    'reason'        => 'customer_payment',
                    'reference'     => "Abono Cliente #{$customer->id} ({$customer->name})",
                    'notes'         => $data['notes'],
                ]);
            }
        });

        return back()->with('success', 'Abono registrado y aplicado exitosamente.');
    }
}
