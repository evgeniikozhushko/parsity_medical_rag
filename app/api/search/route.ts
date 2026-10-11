import { searchClinicalNotes } from '@/lib/vector-search';
import { NextResponse } from 'next/server';

/**
 * Raw vector search, for poking at retrieval — Week 2, built in class.
 * Parse { query, topK }, call searchClinicalNotes (lib/vector-search.ts),
 * return the results as JSON.
 */
export async function POST(request: Request) {
	const query = await request.json();
	const results = await searchClinicalNotes(query, { topK: 10 });

	return NextResponse.json(results);

	return NextResponse.json(
		{ error: 'Not built yet — Week 2 (app/api/search/route.ts)' },
		{ status: 501 },
	);
}