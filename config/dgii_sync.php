<?php

return [
    'max_upload_mb' => env('DGII_MAX_UPLOAD_MB', 256),
    'tick_every'    => env('DGII_TICK_EVERY', 1000),
    'buffer_upsert' => env('DGII_BUFFER_UPSERT', 1000),
    'commit_every'  => env('DGII_COMMIT_EVERY', 10000),
    'disk' => env('DGII_SYNC_DISK', 'dgii'),
];
