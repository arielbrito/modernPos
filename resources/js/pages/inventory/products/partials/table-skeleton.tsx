import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"><Skeleton className="h-5 w-5" /></TableHead>
                        <TableHead className="w-[72px]"><Skeleton className="h-10 w-10 rounded-md" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                        <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                        <TableHead><Skeleton className="h-6 w-16" /></TableHead>
                        <TableHead className="w-[80px] text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                            <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}