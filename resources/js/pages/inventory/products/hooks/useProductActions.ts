import { Product } from '@/types';
import { useCallback, useState } from 'react';

export interface UseProductActionsResult {
    isFormOpen: boolean;
    setIsFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
    productToEdit: Product | null;
    isDeleteModalOpen: boolean;
    setDeleteModalOpen: (isOpen: boolean) => void;
    productToDelete: Product | null;
    handleCreate: () => void;
    handleEdit: (product: Product) => void;
    handleDelete: (product: Product) => void;
}

/**
 * Hook para gestionar el estado de los diálogos (modales) y
 * las acciones CRUD de la página de productos.
 */
export function useProductActions(): UseProductActionsResult {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const handleCreate = useCallback(() => {
        setProductToEdit(null);
        setIsFormOpen(true);
    }, []);

    const handleEdit = useCallback((product: Product) => {
        setProductToEdit(product);
        setIsFormOpen(true);
    }, []);

    const handleDelete = useCallback((product: Product) => {
        setProductToDelete(product);
        setDeleteModalOpen(true);
    }, []);

    return {
        isFormOpen,
        setIsFormOpen,
        productToEdit,
        isDeleteModalOpen,
        setDeleteModalOpen,
        productToDelete,
        handleCreate,
        handleEdit,
        handleDelete,
    };
}
