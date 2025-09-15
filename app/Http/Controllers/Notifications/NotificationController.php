<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    // Dropdown: JSON para la campanita (ligero y rápido)
    public function dropdown(Request $req)
    {
        $user = $req->user();

        $unread = $user->unreadNotifications()
            ->latest()
            ->take(10)
            ->get(['id', 'type', 'data', 'read_at', 'created_at']);

        // Unos pocos leídos recientes para completar el dropdown
        $read = $user->readNotifications()
            ->latest()
            ->take(10)
            ->get(['id', 'type', 'data', 'read_at', 'created_at']);

        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'items' => [
                'unread' => $unread,
                'read'   => $read,
            ],
        ]);
    }

    // Página Inertia
    public function index(Request $req)
    {
        $user = $req->user();

        $notifications = $user->notifications()
            ->latest()
            ->paginate(20, ['id', 'type', 'data', 'read_at', 'created_at'])
            ->through(function ($n) {
                return [
                    'id'         => $n->id,
                    'type'       => $n->type,
                    'data'       => $n->data,
                    'read_at'    => $n->read_at,
                    'created_at' => $n->created_at,
                ];
            });

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'unread_count'  => $user->unreadNotifications()->count(),
        ]);
    }

    public function markRead(Request $req, string $id)
    {
        $n = $req->user()->notifications()->where('id', $id)->firstOrFail();
        if (is_null($n->read_at)) {
            $n->markAsRead();
        }
        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $req)
    {
        $req->user()->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }

    public function destroy(Request $req, string $id)
    {
        $n = $req->user()->notifications()->where('id', $id)->firstOrFail();
        $n->delete();
        return response()->json(['ok' => true]);
    }
}
