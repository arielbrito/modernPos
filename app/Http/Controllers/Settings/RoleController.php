<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::withCount(['users', 'permissions'])->paginate(10);
        return Inertia::render('settings/roles/index', ['roles' => $roles]);
    }

    public function create()
    {
        $permissions = Permission::all()->groupBy('group');
        return Inertia::render('settings/roles/create', ['groupedPermissions' => $permissions]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|unique:roles,name',
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        DB::transaction(function () use ($validated) {
            $role = Role::create(['name' => $validated['name']]);
            $role->syncPermissions($validated['permissions']);
        });

        return redirect()->route('roles.index')->with('success', 'Rol creado exitosamente.');
    }

    public function edit(Role $role)
    {
        $role->load('permissions:id'); // Carga solo los IDs de los permisos
        $permissions = Permission::all()->groupBy('group');

        return Inertia::render('settings/roles/edit', [
            'role' => $role,
            'groupedPermissions' => $permissions,
            'assignedPermissionIds' => $role->permissions->pluck('id'),
        ]);
    }

    public function update(Request $request, Role $role)
    {
        if ($role->name === 'Super-Admin') {
            return back()->with('error', 'El rol Super-Admin no se puede modificar.');
        }

        $validated = $request->validate([
            'name' => 'required|unique:roles,name,' . $role->id,
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        DB::transaction(function () use ($role, $validated) {
            $role->update(['name' => $validated['name']]);
            $role->syncPermissions($validated['permissions']);
        });

        return redirect()->route('roles.index')->with('success', 'Rol actualizado exitosamente.');
    }
}
