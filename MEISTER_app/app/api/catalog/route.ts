import { NextResponse } from 'next/server';
import { loadCatalogFromFile } from '@/lib/catalogService';

export async function GET() {
    try {
        const { entries, lastUpdated } = await loadCatalogFromFile();

        return NextResponse.json({
            success: true,
            catalog: entries,
            lastUpdated,
            count: entries.length,
        });
    } catch (error) {
        console.error('Error loading catalog:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to load catalog',
                catalog: [],
                lastUpdated: '',
            },
            { status: 500 }
        );
    }
}
