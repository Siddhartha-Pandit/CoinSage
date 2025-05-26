// coinsage/src/app/api/currency/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Currency from '@/model/Currency';
import { getUserFromToken } from '@/lib/auth';

/**
 * GET /api/currency
 *   → Returns an array of all currencies, but only if user is authenticated.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Token retrieval: header first, then cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) token = req.cookies.get('accessToken')?.value; 

    // 2. Verify JWT, get userId
    getUserFromToken(token || ''); // we don't need userId here; just ensure logged in :contentReference[oaicite:10]{index=10}

    // 3. Connect to database
    await dbConnect();

    // 4. Fetch and return all currency documents
    const currencies = await Currency.find({});
    return NextResponse.json(currencies);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

/**
 * POST /api/currency
 *   → Create a new currency (symbol + name). Only authenticated users can create.
 */
// export async function POST(req: NextRequest) {
//   try {
//     // 1. Token retrieval
//     let token = req.headers.get('authorization')?.split(' ')[1];
//     if (!token) token = req.cookies.get('accessToken')?.value; 

//     // 2. Verify JWT, get userId (not used in Currency schema, but enforces login)
//     getUserFromToken(token || ''); 

//     // 3. Parse request body
//     const { symbol, name } = await req.json();
//     if (!symbol?.trim() || !name?.trim()) {
//       return NextResponse.json(
//         { error: 'Both symbol and name are required' },
//         { status: 400 }
//       );
//     }

//     // 4. Connect to DB
//     await dbConnect();

//     // 5. Uniqueness check (case-insensitive)
//     const upperSymbol = symbol.trim().toUpperCase();
//     const existing = await Currency.findOne({ symbol: upperSymbol });
//     if (existing) {
//       return NextResponse.json(
//         { error: `Currency with symbol "${upperSymbol}" already exists` },
//         { status: 409 }
//       );
//     }

//     // 6. Create and return new document
//     const currency = await Currency.create({
//       symbol: upperSymbol,
//       name:   name.trim()
//     });
//     return NextResponse.json(currency, { status: 201 });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || 'Unauthorized' },
//       { status: 401 }
//     );
//   }
// }
// export async function POST(req: NextRequest) {
//   try {
   
//     await dbConnect();

//     const response = await fetch('https://api.currencyapi.com/v3/currencies?apikey=cur_live_9OBnVcbIe1PfTPUzBaxobaCbFCh5nsJSzyaZkDMe');
//     if (!response.ok) {
//       throw new Error('Failed to fetch currencies from external API');
//     }
//     const data = await response.json();

//     const currencies = Object.entries(data.data).map(([symbol, details]: [string, any]) => ({
//       symbol,
//       name: details.name,
//     }));

//     // Insert currencies into the database, ignoring duplicates
//     for (const currency of currencies) {
//       await Currency.updateOne(
//         { symbol: currency.symbol },
//         { $setOnInsert: currency },
//         { upsert: true }
//       );
//     }

//     return NextResponse.json({ message: 'Currencies added successfully' });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }