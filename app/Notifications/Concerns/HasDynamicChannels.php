<?php

// app/Notifications/Concerns/HasDynamicChannels.php
namespace App\Notifications\Concerns;

trait HasDynamicChannels
{
    protected array $viaChannels = ['database'];
    public function setChannels(array $channels): static
    {
        $this->viaChannels = array_values(array_unique($channels));
        return $this;
    }
    public function via(object $notifiable): array
    {
        return $this->viaChannels;
    }
}
