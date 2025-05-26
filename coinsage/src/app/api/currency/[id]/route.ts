// coinsage/src/app/api/currency/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Currency from '@/model/Currency';
import { getUserFromToken } from '@/lib/auth';

/**
 * GET /api/currency/:id
 *   → Returns one currency by its _id. Must be authenticated.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Token retrieval
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) token = req.cookies.get('accessToken')?.value; 

    // 2. Verify JWT
    getUserFromToken(token || '');

    // 3. Validate ID presence
    if (!params.id) {
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    // 4. Connect to DB & fetch document by ID
    await dbConnect();
    const currency = await Currency.findById(params.id);
    if (!currency) {
      return NextResponse.json({ error: 'Currency not found' }, { status: 404 });
    }

    // 5. Return found document
    return NextResponse.json(currency);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized or invalid ID' },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/currency/:id
 *   → Updates “symbol” and/or “name” for a currency. Must be authenticated.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Token retrieval
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) token = req.cookies.get('accessToken')?.value; 

    // 2. Verify JWT
    getUserFromToken(token || ''); 

    // 3. Ensure ID is provided
    if (!params.id) {
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    // 4. Parse request body
    const updates = await req.json();
    const updateData: Partial<{ symbol: string; name: string }> = {};

    if (typeof updates.symbol === 'string' && updates.symbol.trim()) {
      updateData.symbol = updates.symbol.trim().toUpperCase();
    }
    if (typeof updates.name === 'string' && updates.name.trim()) {
      updateData.name = updates.name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update (symbol or name required)' },
        { status: 400 }
      );
    }

    // 5. Connect to DB
    await dbConnect();

    // 6. If updating symbol, check uniqueness (exclude current doc)
    if (updateData.symbol) {
      const conflict = await Currency.findOne({
        symbol: updateData.symbol,
        _id: { $ne: params.id },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Another currency already uses symbol "${updateData.symbol}"` },
          { status: 409 }
        );
      }
    }

    // 7. Update and return new document
    const currency = await Currency.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );
    if (!currency) {
      return NextResponse.json({ error: 'Currency not found' }, { status: 404 });
    }

    return NextResponse.json(currency);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized or invalid ID' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/currency/:id
 *   → Deletes a currency by its ID. Must be authenticated.
 */
// export async function DELETE(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     // 1. Token retrieval
//     let token = req.headers.get('authorization')?.split(' ')[1];
//     if (!token) token = req.cookies.get('accessToken')?.value; 

//     // 2. Verify JWT
//     getUserFromToken(token || ''); 

//     // 3. Ensure ID is provided
//     if (!params.id) {
//       return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
//     }

//     // 4. Connect to DB
//     await dbConnect();

//     // 5. Delete document by ID
//     const currency = await Currency.findByIdAndDelete(params.id);
//     if (!currency) {
//       return NextResponse.json({ error: 'Currency not found' }, { status: 404 });
//     }

//     return NextResponse.json({ message: 'Currency deleted successfully' });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || 'Unauthorized or invalid ID' },
//       { status: 400 }
//     );
//   }
// }
