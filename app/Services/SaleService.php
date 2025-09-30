<?php
// app/Services/SaleService.php
namespace App\Services;

use App\Events\SaleCompleted; // Importamos el Evento
use App\Models\{
    Sale,
    SaleLine,
    SalePayment,
    ProductVariant,
    Inventory,
    Customer,
    CashShift,
    Tax
};
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class SaleService
{
    public function __construct(
        protected NcfService $ncf,
        protected CashRegisterService $cash
    ) {}

    /**
     * Crea la venta COMPLETA (líneas, pago, inventario, NCF y movimientos de caja).
     */
    public function create(array $input, ?int $userId = null): Sale
    {
        // --- 1. SETUP & INITIAL VALIDATION ---
        $userId     ??= Auth::id();
        $storeId    = (int)($input['store_id'] ?? session('active_store_id'));
        $registerId = $input['register_id'] ?? session('active_register_id');
        $shiftId    = $input['shift_id'] ?? session('active_shift_id');

        if (!$storeId || !$registerId || !$shiftId) {
            throw new InvalidArgumentException('Se requiere una tienda, caja y turno activos.');
        }

        $shift = CashShift::query()->where('id', $shiftId)->where('status', 'open')->lockForUpdate()->first();
        if (!$shift) throw new InvalidArgumentException('Turno inválido o no está abierto.');

        $lines    = $input['lines'] ?? [];
        $payments = $input['payments'] ?? [];
        if (empty($lines)) throw new InvalidArgumentException('No se recibieron líneas de venta.');

        // --- 2. CUSTOMER & CREDIT LOGIC ---
        $customer = !empty($input['customer_id']) ? Customer::find($input['customer_id']) : null;

        $isCreditSale = count($payments) === 1 && ($payments[0]['method'] ?? '') === 'credit';
        if ($isCreditSale) {
            if (!$customer) throw new InvalidArgumentException('Se debe seleccionar un cliente para las ventas a crédito.');
            if (!$customer->allow_credit) throw new InvalidArgumentException("El cliente {$customer->name} no tiene el crédito habilitado.");
        }

        // --- 3. BILLING SNAPSHOT ---
        $billToName       = trim((string)($input['bill_to_name'] ?? ($customer?->name ?? 'Consumidor Final')));
        $billToDocType    = strtoupper((string)($input['bill_to_doc_type'] ?? ($customer?->document_type ?? 'NONE')));
        $billToDocNumber  = (string)($input['bill_to_doc_number'] ?? ($customer?->document_number ?? null));
        $billToIsTaxpayer = (bool)($input['bill_to_is_taxpayer'] ?? ($customer?->is_taxpayer ?? false));

        if (!in_array($billToDocType, ['RNC', 'CED', 'NONE'], true)) {
            $billToDocType = 'NONE';
        }
        if ($billToDocType === 'NONE') {
            $billToDocNumber  = null;
            $billToIsTaxpayer = false;
        }

        $saleCurrency = strtoupper((string)($input['currency_code'] ?? 'DOP'));
        $occurredAt   = $input['occurred_at'] ?? now();
        $meta         = $input['meta'] ?? [];

        return DB::transaction(function () use (
            $storeId,
            $registerId,
            $shift,
            $customer,
            $billToName,
            $billToDocType,
            $billToDocNumber,
            $billToIsTaxpayer,
            $saleCurrency,
            $occurredAt,
            $meta,
            $lines,
            $payments,
            $userId,
            $isCreditSale
        ) {
            // =======================================================
            // === 1. CARGA MASIVA y BLOQUEO (OPTIMIZACIÓN CLAVE) ====
            // =======================================================

            $variantIds = array_column($lines, 'variant_id');

            // Cargar TODAS las ProductVariants necesarias con sus productos (1 consulta)
            $variants = ProductVariant::with('product')
                ->whereIn('id', $variantIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // Cargar TODO el Inventory necesario y BLOQUEARLO (1 consulta)
            $inventory = Inventory::query()
                ->where('store_id', $storeId)
                ->whereIn('product_variant_id', $variantIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('product_variant_id');

            // =======================================================
            // === STEP 2: Create Sale Header y Procesar Líneas =======
            // =======================================================

            $sale = new Sale();
            $sale->fill([
                'store_id'              => $storeId,
                'register_id'           => $registerId,
                'shift_id'              => $shift->id,
                'user_id'               => $userId,
                'customer_id'           => $customer?->id,
                'bill_to_name'          => $billToName,
                'bill_to_doc_type'      => $billToDocType,
                'bill_to_doc_number'    => $billToDocNumber,
                'bill_to_is_taxpayer'   => $billToIsTaxpayer,
                'currency_code'         => $saleCurrency,
                'number'                => $this->nextNumber($storeId),
                'status'                => 'completed',
                'occurred_at'           => $occurredAt,
                'meta'                  => $meta,
            ]);
            $sale->save(); // Se crea el ID de venta

            $subtotal = 0;
            $discountTotal = 0;
            $taxTotal = 0;
            $grandTotal = 0;

            // Datos a pasar al Listener en cola para Stock/Alertas
            $saleLineData = [];

            foreach ($lines as $i => $row) {
                $variantId  = (int)$row['variant_id'];

                /** @var ProductVariant $variant */
                $variant = $variants->get($variantId);

                if (!$variant) {
                    throw new InvalidArgumentException("Variante #{$variantId} no encontrada.");
                }

                $qty        = (float)$row['qty'];
                $unitPrice  = round((float)$row['unit_price'], 2);

                if ($qty <= 0) {
                    throw new InvalidArgumentException("Cantidad inválida en línea #" . ($i + 1));
                }

                // --- Lógica de cálculo (rápida, sin BD) ---
                $discPct = isset($row['discount_percent']) ? (float)$row['discount_percent'] : 0.0;
                $discAmt = isset($row['discount_amount'])  ? round((float)$row['discount_amount'], 2) : 0.0;

                $lineBase = round($qty * $unitPrice, 2);
                if ($discPct > 0 && $discAmt <= 0) {
                    $discAmt = round($lineBase * ($discPct / 100), 2);
                } elseif ($discPct <= 0 && $discAmt > 0 && $lineBase > 0) {
                    $discPct = round(($discAmt / $lineBase) * 100, 2);
                }

                $taxCode = $row['tax_code'] ?? null;
                $taxName = $row['tax_name'] ?? null;
                $taxRate = isset($row['tax_rate']) ? (float)$row['tax_rate'] : 0.0;

                $totalExTax = max(0, round($lineBase - $discAmt, 2));
                $lineTaxAmt = round($totalExTax * $taxRate, 2);
                $lineTotal  = round($totalExTax + $lineTaxAmt, 2);

                $subtotal      += $lineBase;
                $discountTotal += $discAmt;
                $taxTotal      += $lineTaxAmt;
                $grandTotal    += $lineTotal;

                // --- Creación de SaleLine ---
                $snapshotName = $variant->product?->name ?: ($row['name'] ?? $variant->sku ?? "Var #{$variant->id}");
                $snapshotSku  = $variant->sku ?? null;
                $snapshotAttr = $variant->attributes ?? null;
                if (is_string($snapshotAttr)) {
                    $decoded = json_decode($snapshotAttr, true);
                    $snapshotAttr = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
                }

                SaleLine::create([
                    'sale_id'          => $sale->id,
                    'variant_id'       => $variant->id,
                    'sku'              => $snapshotSku,
                    'name'             => $snapshotName,
                    'attributes'       => $snapshotAttr,
                    'qty'              => $qty,
                    'unit_price'       => $unitPrice,
                    'discount_percent' => $discPct,
                    'discount_amount'  => $discAmt,
                    'tax_code'         => $taxCode,
                    'tax_name'         => $taxName,
                    'tax_rate'         => $taxRate,
                    'tax_amount'       => $lineTaxAmt,
                    'total_ex_tax'     => $totalExTax,
                    'line_total'       => $lineTotal,
                ]);

                // --- Única Interacción de Inventario Síncrona (Decremento) ---
                if ($variant->product->isStockable()) {
                    /** @var Inventory $inv */
                    $inv = $inventory->get($variant->id);

                    if (!$inv || (float) $inv->quantity < $qty) {
                        $name = $variant->product->name ?? $variant->sku ?? "Var #{$variant->id}";
                        $available = number_format((float)($inv->quantity ?? 0), 2);
                        throw ValidationException::withMessages([
                            'stock' => "Stock insuficiente para «{$name}». Disponible: {$available}, solicitado: {$qty}.",
                        ]);
                    }

                    // CRÍTICO: El único decremento para mantener el stock actualizado
                    $inv->decrement('quantity', $qty);

                    // Almacenar datos para la cola (Movement y Alert)
                    $saleLineData[] = [
                        'variant_id' => $variant->id,
                        'qty' => $qty,
                        'cogs_unit' => (float)$variant->average_cost,
                        'reorder_point' => (float)$inv->reorder_point,
                        'remaining_qty' => (float)$inv->quantity - $qty, // Stock después del decremento
                        'product_name' => $variant->product->name ?? null,
                        'sku' => $variant->sku ?? null,
                    ];
                }
            }


            // =======================================================
            // === STEP 3: NCF (Se mantiene igual) ====================
            // =======================================================
            $requested = $input['ncf_type'] ?? null;

            $baseType = $customer
                ? $this->ncf->defaultTypeForCustomer($customer)
                : ($billToDocType === 'RNC' ? 'B01' : 'B02');

            $isGeneric = ($billToDocType === 'NONE');
            if ($isGeneric) {
                $ncfType = 'B02';
            } else {
                if ($requested === 'B01') {
                    if ($billToDocType !== 'RNC') {
                        throw new InvalidArgumentException('Para B01 el receptor debe tener RNC.');
                    }
                    $ncfType = 'B01';
                } elseif ($requested === 'B02') {
                    $ncfType = 'B02';
                } else {
                    $ncfType = $baseType;
                }
            }

            try {
                $ncfNumber = $this->ncf->consume($storeId, $ncfType);
                $sale->ncf_type       = $ncfType;
                $sale->ncf_number     = $ncfNumber;
                $sale->ncf_emitted_at = now();
            } catch (\Throwable $e) {
                if ($billToDocType === 'RNC') {
                    throw new InvalidArgumentException('No fue posible asignar NCF (secuencia no disponible).');
                }
                $sale->ncf_type   = null;
                $sale->ncf_number = null;
            }

            // =======================================================
            // === STEP 4: Save Totals to Sale (CRITICAL STEP) =======
            // =======================================================
            $sale->subtotal       = round($subtotal, 2);
            $sale->discount_total = round($discountTotal, 2);
            $sale->tax_total      = round($taxTotal, 2);
            $sale->total          = round($grandTotal, 2);
            $sale->save(); // Segunda salvada con los totales

            // =======================================================
            // === STEP 5: Process Payments (RESTAURADO) =============
            // =======================================================
            if ($isCreditSale) {
                // --- CREDIT SALE FLOW ---
                if ($customer->credit_limit > 0 && ($customer->balance + $sale->total) > $customer->credit_limit) {
                    throw ValidationException::withMessages(['credit_limit' => 'This sale exceeds the customer\'s credit limit.']);
                }

                $sale->payments()->create([
                    'method'        => 'credit',
                    'amount'        => $sale->total,
                    'currency_code' => $sale->currency_code,
                ]);

                $sale->paid_total = 0;
                $sale->due_total  = $sale->total;
                $customer->increment('balance', $sale->total);
            } else {
                // --- FLUJO DE VENTA NORMAL ---
                $paidInSaleCcy = 0.0;
                foreach ($payments as $p) {
                    $method   = (string)$p['method'];
                    $amount   = (float)$p['amount'];
                    $payCcy   = strtoupper((string)($p['currency_code'] ?? $sale->currency_code));
                    $ref      = $p['reference'] ?? null;

                    $fxRate = isset($p['fx_rate_to_sale'])
                        ? (float)$p['fx_rate_to_sale']
                        : (isset($p['fx_rate']) ? (float)$p['fx_rate'] : null);

                    $tendered = isset($p['tendered_amount']) && $p['tendered_amount'] !== ''
                        ? (float)$p['tendered_amount'] : null;

                    $changeAmt = isset($p['change_amount']) && $p['change_amount'] !== ''
                        ? (float)$p['change_amount'] : null;

                    $changeCcy = $p['change_currency_code'] ?? $payCcy;

                    if ($amount <= 0) continue;

                    /** @var \App\Models\SalePayment $sp */
                    $sp = SalePayment::create([
                        'sale_id'              => $sale->id,
                        'method'               => $method,
                        'amount'               => round($amount, 2),
                        'currency_code'        => $payCcy,
                        'fx_rate_to_sale'      => $fxRate,
                        'tendered_amount'      => $tendered,
                        'change_amount'        => $changeAmt,
                        'change_currency_code' => $changeCcy,
                        'reference'            => $ref,
                        'bank_name' => $p['bank_name'] ?? null,
                        'card_brand' => $p['card_brand'] ?? null,
                        'card_last4' => $p['card_last4'] ?? null,
                        'meta'                 => [],
                    ]);

                    $equiv = $payCcy === $sale->currency_code
                        ? $amount
                        : ($fxRate ? $amount * $fxRate : 0.0);

                    $paidInSaleCcy += $equiv;

                    // Ingreso a caja si el pago es en efectivo
                    if ($method === 'cash') {
                        $this->cash->movement(
                            shiftId: $shift->id,
                            userId: $userId,
                            direction: 'in',
                            currency: $payCcy,
                            amount: round($amount, 2),
                            reason: 'sale',
                            reference: $sale->number,
                            meta: ['payment_id' => $sp->id],
                            source: $sale,
                        );

                        if ($tendered && $tendered > $amount) {
                            $changeInPayCcy = round($tendered - $amount, 2);
                            $finalChangeAmount = $changeInPayCcy;

                            if ($changeCcy !== $payCcy && $fxRate) {
                                $finalChangeAmount = round($changeInPayCcy * $fxRate, 2);
                            }

                            $sp->update([
                                'change_amount' => $finalChangeAmount,
                                'change_currency_code' => $changeCcy
                            ]);
                        }
                    }
                }

                if (round($paidInSaleCcy, 2) + 0.00001 < round($sale->total, 2)) {
                    throw new InvalidArgumentException('Los pagos no cubren el total de la venta.');
                }
                $sale->paid_total = round($paidInSaleCcy, 2);
                $sale->due_total  = max(0, round($sale->total - $sale->paid_total, 2));
            }

            $sale->save();

            // =======================================================
            // === STEP 6: DISPARAR EVENTO (FUERA DE LÍNEA) ===========
            // =======================================================
            // Esto asegura que la lógica de ProductStockMovement y SystemAlert 
            // no bloquee la respuesta HTTP.
            event(new SaleCompleted($sale, $saleLineData, $userId));

            return $sale->fresh(['lines', 'payments', 'customer']);
        });
    }

    /** Genera correlativo tipo POS-YYYY-###### por tienda */
    protected function nextNumber(int $storeId): string
    {
        $yy = now()->format('Y');

        // Esta consulta es O(N) pero se mantiene por ahora, la prioridad es el bucle.
        $last = Sale::query()
            ->where('store_id', $storeId)
            ->where('number', 'like', "POS-{$yy}-%")
            ->latest('id')
            ->value('number');

        $seq = 1;
        if ($last && preg_match('/POS-\d{4}-(\d+)/', $last, $m)) {
            $seq = (int)$m[1] + 1;
        }
        return sprintf('POS-%s-%06d', $yy, $seq);
    }
}
