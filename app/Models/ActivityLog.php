<?php

// app/Models/ActivityLog.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'subject_type',
        'subject_id',
        'causer_id',
        'event',
        'description',
        'changes',
    ];

    protected $casts = ['changes' => 'array'];

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
    public function causer()
    {
        return $this->belongsTo(User::class, 'causer_id');
    }

    public static function record(Model $subject, string $event, array $changes = [], ?int $causerId = null, ?string $description = null): self
    {
        return static::create([
            'subject_type' => get_class($subject),
            'subject_id'   => $subject->getKey(),
            'causer_id'    => $causerId,
            'event'        => $event,
            'description'  => $description,
            'changes'      => $changes,
        ]);
    }
}
